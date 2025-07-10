import { PrismaClient } from '@prisma/client';
import { response, pagination } from '../utils/index.js';
import { cloudinaryService } from '../services/index.js';

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
                    console.error('Logo upload error:', uploadError);
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
            console.error('Create category error:', error);
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
                        _count: {
                            select: {
                                articles: true,
                                rssFeeds: true
                            }
                        }
                    }
                }),
                prisma.category.count({ where })
            ]);

            // Create paginated response
            const paginatedData = pagination.createPaginatedResponse(
                categories, 
                req.query, 
                total, 
                { defaultLimit: 10, maxLimit: 100 }
            );

            return response.success(res, paginatedData, 'Categories retrieved successfully');
        } catch (error) {
            console.error('Get categories error:', error);
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
                    _count: {
                        select: {
                            articles: true,
                            rssFeeds: true
                        }
                    }
                }
            });

            if (!category) {
                return response.error(res, 'Category not found', 404);
            }

            return response.success(res, category, 'Category retrieved successfully');
        } catch (error) {
            console.error('Get category error:', error);
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
                    console.error('Logo upload error:', uploadError);
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
            console.error('Update category error:', error);
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
                    console.error('Failed to delete logo from cloudinary:', deleteError);
                }
            }

            await prisma.category.delete({
                where: { id }
            });

            return response.success(res, null, 'Category deleted successfully');
        } catch (error) {
            console.error('Delete category error:', error);
            return response.error(res, 'Failed to delete category', 500);
        }
    }
}

export default CategoryController;
