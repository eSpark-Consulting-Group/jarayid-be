import prisma from '../prisma/index.js';
import { response, pagination } from '../utils/index.js';
import winston from 'winston';

// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] Cookie Controller: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

class CookieController {
    constructor() {
        this.prisma = prisma;
    }
    /**
     * Create a new cookie
     * POST /api/cookies
     */
    async createCookie(req, res) {
        try {
            const { name, purpose, duration, isEnabled, description } = req.body;

            // Check if cookie with same name already exists
            const existingCookie = await prisma.cookie.findUnique({
                where: { name }
            });

            if (existingCookie) {
                return response.error(res, 'Cookie with this name already exists', 409);
            }

            const cookie = await prisma.cookie.create({
                data: {
                    name,
                    purpose,
                    duration,
                    isEnabled: isEnabled !== undefined ? isEnabled : true,
                    description: description || null
                }
            });

            logger.info('Cookie created successfully', {
                cookieId: cookie.id,
                name: cookie.name,
                adminId: req.user?.id
            });

            return response.success(res, { cookie }, 'Cookie created successfully');

        } catch (error) {
            logger.error('Create cookie error:', { error: error.message, adminId: req.user?.id });
            return response.error(res, 'Failed to create cookie', 500, error.message);
        }
    }

    /**
     * Get all cookies with filtering and pagination
     * GET /api/cookies
     */
    async getAllCookies(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                isEnabled,
                search,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = req.query;

            // Build where conditions
            const where = {};

            if (isEnabled !== undefined) {
                where.isEnabled = isEnabled === 'true';
            }

            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { purpose: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } }
                ];
            }

            // Build orderBy
            const orderBy = {};
            orderBy[sortBy] = sortOrder;

            // Get pagination parameters
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const take = parseInt(limit);

            // Fetch cookies and total count
            const [cookies, total] = await Promise.all([
                prisma.cookie.findMany({
                    where,
                    skip,
                    take,
                    orderBy
                }),
                prisma.cookie.count({ where })
            ]);

            const responseData = {
                cookies,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
                    hasPrevPage: parseInt(page) > 1
                },
                meta: {
                    totalCookies: total,
                    currentPageCookies: cookies.length,
                    filters: { isEnabled, search }
                }
            };

            return response.success(res, responseData, 'Cookies retrieved successfully');

        } catch (error) {
            logger.error('Get all cookies error:', { error: error.message });
            return response.error(res, 'Failed to retrieve cookies', 500, error.message);
        }
    }

    /**
     * Get public cookies (for cookie consent banner)
     * GET /api/cookies/public
     */
    async getPublicCookies(req, res) {
        try {
            const cookies = await prisma.cookie.findMany({
                where: {
                    isEnabled: true
                },
                select: {
                    id: true,
                    name: true,
                    purpose: true,
                    duration: true,
                    description: true
                },
                orderBy: [
                    { name: 'asc' }
                ]
            });

            return response.success(res, {
                cookies,
                totalCookies: cookies.length
            }, 'Public cookies retrieved successfully');

        } catch (error) {
            logger.error('Get public cookies error:', { error: error.message });
            return response.error(res, 'Failed to retrieve public cookies', 500, error.message);
        }
    }

    /**
     * Get single cookie by ID
     * GET /api/cookies/:id
     */
    async getCookieById(req, res) {
        try {
            const { id } = req.params;

            const cookie = await prisma.cookie.findUnique({
                where: { id }
            });

            if (!cookie) {
                return response.notFound(res, 'Cookie not found');
            }

            return response.success(res, { cookie }, 'Cookie retrieved successfully');

        } catch (error) {
            logger.error('Get cookie by ID error:', { error: error.message, cookieId: req.params.id });
            return response.error(res, 'Failed to retrieve cookie', 500, error.message);
        }
    }

    /**
     * Update cookie
     * PUT /api/cookies/:id
     */
    async updateCookie(req, res) {
        try {
            const { id } = req.params;
            const { name, purpose, duration, isEnabled, description } = req.body;

            // Check if cookie exists
            const existingCookie = await prisma.cookie.findUnique({
                where: { id }
            });

            if (!existingCookie) {
                return response.notFound(res, 'Cookie not found');
            }

            // Check if name is being changed and if new name already exists
            if (name && name !== existingCookie.name) {
                const nameExists = await prisma.cookie.findUnique({
                    where: { name }
                });

                if (nameExists) {
                    return response.error(res, 'Cookie with this name already exists', 409);
                }
            }

            const updatedCookie = await prisma.cookie.update({
                where: { id },
                data: {
                    ...(name && { name }),
                    ...(purpose && { purpose }),
                    ...(duration && { duration }),
                    ...(isEnabled !== undefined && { isEnabled }),
                    ...(description !== undefined && { description })
                }
            });

            logger.info('Cookie updated successfully', {
                cookieId: id,
                name: updatedCookie.name,
                adminId: req.user?.id
            });

            return response.success(res, { cookie: updatedCookie }, 'Cookie updated successfully');

        } catch (error) {
            logger.error('Update cookie error:', { error: error.message, cookieId: req.params.id, adminId: req.user?.id });
            return response.error(res, 'Failed to update cookie', 500, error.message);
        }
    }

    /**
     * Delete cookie
     * DELETE /api/cookies/:id
     */
    async deleteCookie(req, res) {
        try {
            const { id } = req.params;

            // Check if cookie exists
            const existingCookie = await prisma.cookie.findUnique({
                where: { id }
            });

            if (!existingCookie) {
                return response.notFound(res, 'Cookie not found');
            }

            await prisma.cookie.delete({
                where: { id }
            });

            logger.info('Cookie deleted successfully', {
                cookieId: id,
                name: existingCookie.name,
                adminId: req.user?.id
            });

            return response.success(res, null, 'Cookie deleted successfully');

        } catch (error) {
            logger.error('Delete cookie error:', { error: error.message, cookieId: req.params.id, adminId: req.user?.id });
            return response.error(res, 'Failed to delete cookie', 500, error.message);
        }
    }

    /**
     * Toggle cookie enabled status
     * PATCH /api/cookies/:id/toggle
     */
    async toggleCookieStatus(req, res) {
        try {
            const { id } = req.params;

            const cookie = await prisma.cookie.findUnique({
                where: { id }
            });

            if (!cookie) {
                return response.notFound(res, 'Cookie not found');
            }

            const updatedCookie = await prisma.cookie.update({
                where: { id },
                data: {
                    isEnabled: !cookie.isEnabled
                }
            });

            const action = updatedCookie.isEnabled ? 'enabled' : 'disabled';

            logger.info(`Cookie ${action}`, {
                cookieId: id,
                name: cookie.name,
                action,
                adminId: req.user?.id
            });

            return response.success(res, {
                cookie: updatedCookie,
                action
            }, `Cookie ${action} successfully`);

        } catch (error) {
            logger.error('Toggle cookie status error:', { error: error.message, cookieId: req.params.id, adminId: req.user?.id });
            return response.error(res, 'Failed to toggle cookie status', 500, error.message);
        }
    }

    /**
     * Get cookie statistics
     * GET /api/cookies/stats
     */
    async getCookieStats(req, res) {
        try {
            const [
                totalCookies,
                enabledCookies
            ] = await Promise.all([
                prisma.cookie.count(),
                prisma.cookie.count({ where: { isEnabled: true } })
            ]);

            const stats = {
                overview: {
                    totalCookies,
                    enabledCookies,
                    disabledCookies: totalCookies - enabledCookies
                }
            };

            return response.success(res, stats, 'Cookie statistics retrieved successfully');

        } catch (error) {
            logger.error('Get cookie stats error:', { error: error.message, adminId: req.user?.id });
            return response.error(res, 'Failed to retrieve cookie statistics', 500, error.message);
        }
    }

    /**
     * Bulk update cookies
     * PATCH /api/cookies/bulk-update
     */
    async bulkUpdateCookies(req, res) {
        try {
            const { cookieIds, updates } = req.body;

            if (!cookieIds || !Array.isArray(cookieIds) || cookieIds.length === 0) {
                return response.error(res, 'Cookie IDs array is required and cannot be empty', 400);
            }

            if (!updates || Object.keys(updates).length === 0) {
                return response.error(res, 'Updates object is required and cannot be empty', 400);
            }

            const updateResult = await prisma.cookie.updateMany({
                where: {
                    id: { in: cookieIds }
                },
                data: updates
            });

            logger.info('Bulk cookie update performed', {
                cookieIds,
                updates,
                updatedCount: updateResult.count,
                adminId: req.user?.id
            });

            return response.success(res, {
                updatedCount: updateResult.count,
                updates
            }, `Successfully updated ${updateResult.count} cookie(s)`);

        } catch (error) {
            logger.error('Bulk update cookies error:', { error: error.message, adminId: req.user?.id });
            return response.error(res, 'Failed to bulk update cookies', 500, error.message);
        }
    }
}

export default CookieController;
