import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import { response, pagination } from '../utils/index.js';


// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] YouTube: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
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

const prisma = new PrismaClient();

class YouTubeContentController {
    /**
     * Create new YouTube content
     * POST /api/youtube-content
     */
    async create(req, res) {
        try {
            const userId = req.user.id;
            const { title, youtubeUrl, contentType, categoryId, description, thumbnailUrl, deviceType, duration, isEnabled } = req.body;

            logger.info(`📺 Creating new YouTube content: ${title} (${contentType})`);

            // Check if category exists
            const category = await prisma.category.findUnique({
                where: { id: categoryId },
                select: { id: true, name: true }
            });

            if (!category) {
                return response.error(res, 'Category not found', 404, 'CATEGORY_NOT_FOUND');
            }

            // Check for duplicate YouTube URL
            const existingContent = await prisma.youTubeContent.findFirst({
                where: { youtubeUrl }
            });

            if (existingContent) {
                return response.error(res, 'YouTube URL already exists', 409, 'DUPLICATE_URL');
            }

            // Create YouTube content
            const youtubeContent = await prisma.youTubeContent.create({
                data: {
                    title,
                    youtubeUrl,
                    contentType,
                    categoryId,
                    description: description || null,
                    thumbnailUrl: thumbnailUrl || null,
                    deviceType: deviceType || null,
                    duration: duration || null,
                    isEnabled: isEnabled ?? true,
                    createdById: userId
                },
                include: {
                    category: {
                        select: { id: true, name: true, type: true }
                    },
                    createdBy: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });

            logger.info(`✅ YouTube content created: ${youtubeContent.id}`);

            return response.success(res, youtubeContent, 'YouTube content created successfully', 201);

        } catch (error) {
            logger.error('❌ Error creating YouTube content:', { 
                error: error.message,
                stack: error.stack,
                userId: req.user?.id
            });

            return response.error(res, 'Failed to create YouTube content', 500, error.message);
        }
    }

    /**
     * Get all YouTube content with filtering and pagination
     * GET /api/youtube-content
     */
    async getAll(req, res) {
        try {
            const { 
                page, 
                limit, 
                contentType, 
                categoryId, 
                isEnabled, 
                deviceType, 
                search, 
                sortBy, 
                sortOrder 
            } = req.query;

            logger.info(`📋 Fetching YouTube content list - Page: ${page}, Limit: ${limit}`);

            // Build where condition
            const where = {};
            
            if (contentType) where.contentType = contentType;
            if (categoryId) where.categoryId = categoryId;
            if (typeof isEnabled === 'boolean') where.isEnabled = isEnabled;
            if (deviceType) where.deviceType = deviceType;
            
            if (search) {
                where.OR = [
                    { title: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } }
                ];
            }

            // Build orderBy
            const orderBy = {};
            orderBy[sortBy] = sortOrder;

            // Get total count for pagination
            const totalItems = await prisma.youTubeContent.count({ where });

            // Get paginated data
            const { skip, take } = pagination.getPaginationParams({ page, limit });

            const youtubeContents = await prisma.youTubeContent.findMany({
                where,
                skip,
                take,
                orderBy,
                include: {
                    category: {
                        select: { id: true, name: true, type: true }
                    },
                    createdBy: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });

            // Create paginated response
            const paginatedData = pagination.createPaginatedResponse(
                youtubeContents,
                { page, limit },
                totalItems
            );

            logger.info(`✅ Found ${youtubeContents.length} YouTube contents out of ${totalItems} total`);

            return response.success(res, paginatedData, 'YouTube contents retrieved successfully');

        } catch (error) {
            logger.error('❌ Error fetching YouTube contents:', { 
                error: error.message,
                stack: error.stack
            });

            return response.error(res, 'Failed to fetch YouTube contents', 500, error.message);
        }
    }

    /**
     * Get single YouTube content by ID
     * GET /api/youtube-content/:id
     */
    async getById(req, res) {
        try {
            const { id } = req.params;

            logger.info(`🔍 Fetching YouTube content: ${id}`);

            const youtubeContent = await prisma.youTubeContent.findUnique({
                where: { id },
                include: {
                    category: {
                        select: { id: true, name: true, type: true }
                    },
                    createdBy: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });

            if (!youtubeContent) {
                return response.error(res, 'YouTube content not found', 404, 'CONTENT_NOT_FOUND');
            }

            // Increment view count
            await prisma.youTubeContent.update({
                where: { id },
                data: { viewCount: { increment: 1 } }
            });

            logger.info(`✅ YouTube content found: ${youtubeContent.title}`);

            return response.success(res, youtubeContent, 'YouTube content retrieved successfully');

        } catch (error) {
            logger.error('❌ Error fetching YouTube content:', { 
                error: error.message,
                contentId: req.params.id
            });

            return response.error(res, 'Failed to fetch YouTube content', 500, error.message);
        }
    }

    /**
     * Update YouTube content
     * PUT /api/youtube-content/:id
     */
    async update(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;
            const updateData = req.body;

            logger.info(`✏️ Updating YouTube content: ${id}`);

            // Check if content exists
            const existingContent = await prisma.youTubeContent.findUnique({
                where: { id },
                select: { id: true, createdById: true, title: true }
            });

            if (!existingContent) {
                return response.error(res, 'YouTube content not found', 404, 'CONTENT_NOT_FOUND');
            }

            // Check permissions (only creator or admin can update)
            if (existingContent.createdById !== userId && userRole !== 'ADMIN') {
                return response.error(res, 'Access denied', 403, 'ACCESS_DENIED');
            }

            // If updating categoryId, check if category exists
            if (updateData.categoryId) {
                const category = await prisma.category.findUnique({
                    where: { id: updateData.categoryId },
                    select: { id: true }
                });

                if (!category) {
                    return response.error(res, 'Category not found', 404, 'CATEGORY_NOT_FOUND');
                }
            }

            // If updating YouTube URL, check for duplicates
            if (updateData.youtubeUrl) {
                const duplicateContent = await prisma.youTubeContent.findFirst({
                    where: { 
                        youtubeUrl: updateData.youtubeUrl,
                        id: { not: id }
                    }
                });

                if (duplicateContent) {
                    return response.error(res, 'YouTube URL already exists', 409, 'DUPLICATE_URL');
                }
            }

            // Update content
            const updatedContent = await prisma.youTubeContent.update({
                where: { id },
                data: updateData,
                include: {
                    category: {
                        select: { id: true, name: true, type: true }
                    },
                    createdBy: {
                        select: { id: true, name: true, email: true }
                    }
                }
            });

            logger.info(`✅ YouTube content updated: ${updatedContent.title}`);

            return response.success(res, updatedContent, 'YouTube content updated successfully');

        } catch (error) {
            logger.error('❌ Error updating YouTube content:', { 
                error: error.message,
                contentId: req.params.id,
                userId: req.user?.id
            });

            return response.error(res, 'Failed to update YouTube content', 500, error.message);
        }
    }

    /**
     * Delete YouTube content
     * DELETE /api/youtube-content/:id
     */
    async delete(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;

            logger.info(`🗑️ Deleting YouTube content: ${id}`);

            // Check if content exists
            const existingContent = await prisma.youTubeContent.findUnique({
                where: { id },
                select: { id: true, createdById: true, title: true }
            });

            if (!existingContent) {
                return response.error(res, 'YouTube content not found', 404, 'CONTENT_NOT_FOUND');
            }

            // Check permissions (only creator or admin can delete)
            if (existingContent.createdById !== userId && userRole !== 'ADMIN') {
                return response.error(res, 'Access denied', 403, 'ACCESS_DENIED');
            }

            // Delete content
            await prisma.youTubeContent.delete({
                where: { id }
            });

            logger.info(`✅ YouTube content deleted: ${existingContent.title}`);

            return response.success(res, { id }, 'YouTube content deleted successfully');

        } catch (error) {
            logger.error('❌ Error deleting YouTube content:', { 
                error: error.message,
                contentId: req.params.id,
                userId: req.user?.id
            });

            return response.error(res, 'Failed to delete YouTube content', 500, error.message);
        }
    }

    /**
     * Get YouTube content statistics
     * GET /api/youtube-content/stats
     */
    async getStats(req, res) {
        try {
            logger.info('📊 Fetching YouTube content statistics');

            const [
                totalContent,
                totalShorts,
                totalFullVideos,
                enabledContent,
                disabledContent,
                contentByCategory,
                topViewedContent,
                recentContent
            ] = await Promise.all([
                prisma.youTubeContent.count(),
                prisma.youTubeContent.count({ where: { contentType: 'SHORTS' } }),
                prisma.youTubeContent.count({ where: { contentType: 'FULL_VIDEO' } }),
                prisma.youTubeContent.count({ where: { isEnabled: true } }),
                prisma.youTubeContent.count({ where: { isEnabled: false } }),
                prisma.youTubeContent.groupBy({
                    by: ['categoryId'],
                    _count: { id: true },
                    orderBy: { _count: { id: 'desc' } },
                    take: 5
                }),
                prisma.youTubeContent.findMany({
                    take: 5,
                    orderBy: { viewCount: 'desc' },
                    select: { id: true, title: true, viewCount: true, contentType: true }
                }),
                prisma.youTubeContent.findMany({
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, title: true, createdAt: true, contentType: true }
                })
            ]);

            const stats = {
                overview: {
                    totalContent,
                    totalShorts,
                    totalFullVideos,
                    enabledContent,
                    disabledContent,
                    enabledPercentage: totalContent > 0 ? Math.round((enabledContent / totalContent) * 100) : 0
                },
                byCategory: contentByCategory,
                topViewed: topViewedContent,
                recent: recentContent
            };

            logger.info(`✅ YouTube statistics compiled: ${totalContent} total contents`);

            return response.success(res, stats, 'YouTube content statistics retrieved successfully');

        } catch (error) {
            logger.error('❌ Error fetching YouTube statistics:', { 
                error: error.message 
            });

            return response.error(res, 'Failed to fetch YouTube statistics', 500, error.message);
        }
    }

    /**
     * Toggle content status (enable/disable)
     * PATCH /api/youtube-content/:id/toggle-status
     */
    async toggleStatus(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;

            logger.info(`🔄 Toggling status for YouTube content: ${id}`);

            // Check if content exists
            const existingContent = await prisma.youTubeContent.findUnique({
                where: { id },
                select: { id: true, createdById: true, title: true, isEnabled: true }
            });

            if (!existingContent) {
                return response.error(res, 'YouTube content not found', 404, 'CONTENT_NOT_FOUND');
            }

            // Check permissions (only creator or admin can toggle status)
            if (existingContent.createdById !== userId && userRole !== 'ADMIN') {
                return response.error(res, 'Access denied', 403, 'ACCESS_DENIED');
            }

            // Toggle status
            const updatedContent = await prisma.youTubeContent.update({
                where: { id },
                data: { isEnabled: !existingContent.isEnabled },
                include: {
                    category: {
                        select: { id: true, name: true, type: true }
                    }
                }
            });

            logger.info(`✅ Status toggled for: ${existingContent.title} - Now ${updatedContent.isEnabled ? 'enabled' : 'disabled'}`);

            return response.success(res, updatedContent, `YouTube content ${updatedContent.isEnabled ? 'enabled' : 'disabled'} successfully`);

        } catch (error) {
            logger.error('❌ Error toggling YouTube content status:', { 
                error: error.message,
                contentId: req.params.id
            });

            return response.error(res, 'Failed to toggle content status', 500, error.message);
        }
    }
}

export default new YouTubeContentController();
