import { PrismaClient } from '@prisma/client';
import { response, pagination } from '../utils/index.js';
import { cloudinaryService } from '../services/index.js';
import winston from 'winston';


// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] category Controller: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
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

class CategoryController {
    constructor() {
        this.prisma = prisma;
    }

    async createCategory(req, res) {
        const { name, type, videoUrl, description, seoMeta, thresholdDays } = req.body;

        try {
            const existingCategory = await prisma.category.findFirst({
                where: { 
                    name: {
                        equals: name,
                        mode: 'insensitive'
                    }
                }
            });

            if (existingCategory) {
                return response.error(res, 'Category with this name already exists', 409);
            }

            let logoData = null;

            if (req.file) {
                try {
                    logoData = await cloudinaryService.uploadImage(
                        req.file.buffer,
                        req.file.originalname,
                        'categories'
                    );
                } catch (uploadError) {
                    logger.error('Logo upload error:', { error: uploadError?.message || uploadError });
                    return response.error(res, 'Failed to upload logo', 400);
                }
            }

            const categoryData = {
                name,
                type,
                videoUrl,
                description,
                seoMeta: seoMeta || {},
                thresholdDays: thresholdDays || 7,
                createdById: req.user.id 
            };

            if (logoData) {
                categoryData.logo = logoData.url;
                categoryData.logoKey = logoData.key;
            }

            const category = await prisma.category.create({
                data: categoryData,
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });

            return response.success(res, category, 'Category created successfully', 201);
        } catch (error) {
            logger.error('Create category error:', { error: error?.message || error });
            return response.error(res, 'Failed to create category', 500);
        }
    }

    async getAllCategories(req, res) {
        try {
            const { type, search } = req.query;
            
            // Get pagination parameters
            const { skip, take, page, limit } = pagination.getPaginationParams(req.query, {
                defaultLimit: 10,
                maxLimit: 100
            });

            const where = {};
            
            if (type) {
                where.type = type;
            }

            if (search) {
                where.name = {
                    contains: search,
                    mode: 'insensitive'
                };
            }

            const [categories, total] = await Promise.all([
                prisma.category.findMany({
                    where,
                    skip,
                    take,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        createdBy: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        },
                        youtubeContents: {
                            where: { isEnabled: true },
                            orderBy: { createdAt: 'desc' },
                            select: {
                                id: true,
                                title: true,
                                youtubeUrl: true,
                                contentType: true,
                                thumbnailUrl: true,
                                duration: true,
                                viewCount: true,
                                deviceType: true,
                                createdAt: true
                            }
                        },
                        _count: {
                            select: {
                                articles: true,
                                rssFeeds: true,
                                youtubeContents: true
                            }
                        }
                    }
                }),
                prisma.category.count({ where })
            ]);

            // Enhance categories with YouTube content statistics
            const enhancedCategories = categories.map(category => ({
                ...category,
                youtubeStats: {
                    total: category.youtubeContents.length,
                    shorts: category.youtubeContents.filter(content => content.contentType === 'SHORTS').length,
                    fullVideos: category.youtubeContents.filter(content => content.contentType === 'FULL_VIDEO').length,
                    totalViews: category.youtubeContents.reduce((sum, content) => sum + content.viewCount, 0)
                }
            }));

            // Create paginated response
            const paginatedData = pagination.createPaginatedResponse(
                enhancedCategories, 
                req.query, 
                total, 
                { defaultLimit: 10, maxLimit: 100 }
            );

            return response.success(res, paginatedData, 'Categories retrieved successfully');
        } catch (error) {
            logger.error('Get categories error:', { error: error?.message || error });
            return response.error(res, 'Failed to retrieve categories', 500);
        }
    }

    async getCategoryById(req, res) {
        const { id } = req.params;

        try {
            const category = await prisma.category.findUnique({
                where: { id },
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    youtubeContents: {
                        where: { isEnabled: true },
                        orderBy: [
                            { contentType: 'asc' }, // SHORTS first, then FULL_VIDEO
                            { createdAt: 'desc' }
                        ],
                        select: {
                            id: true,
                            title: true,
                            youtubeUrl: true,
                            contentType: true,
                            thumbnailUrl: true,
                            duration: true,
                            viewCount: true,
                            deviceType: true,
                            description: true,
                            createdAt: true,
                            createdBy: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    },
                    _count: {
                        select: {
                            articles: true,
                            rssFeeds: true,
                            youtubeContents: true
                        }
                    }
                }
            });

            if (!category) {
                return response.error(res, 'Category not found', 404);
            }

            // Enhance category with YouTube content statistics and grouped content
            const enhancedCategory = {
                ...category,
                youtubeStats: {
                    total: category.youtubeContents.length,
                    shorts: category.youtubeContents.filter(content => content.contentType === 'SHORTS').length,
                    fullVideos: category.youtubeContents.filter(content => content.contentType === 'FULL_VIDEO').length,
                    totalViews: category.youtubeContents.reduce((sum, content) => sum + content.viewCount, 0)
                },
                youtubeContentsByType: {
                    shorts: category.youtubeContents.filter(content => content.contentType === 'SHORTS'),
                    fullVideos: category.youtubeContents.filter(content => content.contentType === 'FULL_VIDEO')
                }
            };

            return response.success(res, enhancedCategory, 'Category retrieved successfully');
        } catch (error) {
            logger.error('Get category error:', { error: error?.message || error });
            return response.error(res, 'Failed to retrieve category', 500);
        }
    }

    async updateCategory(req, res) {
        const { id } = req.params;
        const { name, type, videoUrl, description, seoMeta, thresholdDays } = req.body;

        try {
            const existingCategory = await prisma.category.findUnique({
                where: { id }
            });

            if (!existingCategory) {
                return response.error(res, 'Category not found', 404);
            }

            if (name && name !== existingCategory.name) {
                const duplicateCategory = await prisma.category.findFirst({
                    where: {
                        name: {
                            equals: name,
                            mode: 'insensitive'
                        },
                        id: {
                            not: id
                        }
                    }
                });

                if (duplicateCategory) {
                    return response.error(res, 'Category with this name already exists', 409);
                }
            }

            const updateData = {};
            if (name !== undefined) updateData.name = name;
            if (type !== undefined) updateData.type = type;
            if (videoUrl !== undefined) updateData.videoUrl = videoUrl;
            if (description !== undefined) updateData.description = description;
            if (seoMeta !== undefined) updateData.seoMeta = seoMeta;
            if (thresholdDays !== undefined) updateData.thresholdDays = thresholdDays;

            if (req.file) {
                try {
                    if (existingCategory.logoKey) {
                        await cloudinaryService.deleteFile(existingCategory.logoKey);
                    }

                    const logoData = await cloudinaryService.uploadImage(
                        req.file.buffer,
                        req.file.originalname,
                        'categories'
                    );

                    updateData.logo = logoData.url;
                    updateData.logoKey = logoData.key;
                } catch (uploadError) {
                    logger.error('Logo upload error:', { error: uploadError?.message || uploadError });
                    return response.error(res, 'Failed to upload new logo', 400);
                }
            }

            const category = await prisma.category.update({
                where: { id },
                data: updateData,
                include: {
                    createdBy: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });

            return response.success(res, category, 'Category updated successfully');
        } catch (error) {
            logger.error('Update category error:', { error: error?.message || error });
            return response.error(res, 'Failed to update category', 500);
        }
    }

    async deleteCategory(req, res) {
        const { id } = req.params;

        try {
            const existingCategory = await prisma.category.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: {
                            articles: true,
                            rssFeeds: true
                        }
                    }
                }
            });

            if (!existingCategory) {
                return response.error(res, 'Category not found', 404);
            }

            if (existingCategory._count.articles > 0 || existingCategory._count.rssFeeds > 0) {
                return response.error(res, 'Cannot delete category that has associated articles or RSS feeds', 409);
            }

            if (existingCategory.logoKey) {
                try {
                    await cloudinaryService.deleteFile(existingCategory.logoKey);
                } catch (deleteError) {
                    logger.error('Failed to delete logo from cloudinary:', { error: deleteError?.message || deleteError });
                }
            }

            await prisma.category.delete({
                where: { id }
            });

            return response.success(res, null, 'Category deleted successfully');
        } catch (error) {
            logger.error('Delete category error:', { error: error?.message || error });
            return response.error(res, 'Failed to delete category', 500);
        }
    }
}

export default CategoryController;
