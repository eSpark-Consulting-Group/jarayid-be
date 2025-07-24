import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import { response, pagination } from '../utils/index.js';
import { cloudinaryService, viewTrackingService } from '../services/index.js';

// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] Article Controller: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
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

class ArticleController {
    constructor() {
        this.prisma = prisma;
    }

    async createArticle(req, res) {
        const { 
            title, 
            url, 
            source, 
            originalContent, 
            summaryArabic, 
            summaryEnglish, 
            categoryId, 
            pinned = false,
            publishedAt 
        } = req.body;

        try {
            // Validate category exists if provided
            if (categoryId) {
                const category = await prisma.category.findUnique({
                    where: { id: categoryId }
                });

                if (!category) {
                    return response.notFound(res, 'Category not found');
                }
            }

            // Check for duplicate URL only if URL is provided
            if (url) {
                const existingArticle = await prisma.article.findFirst({
                    where: { url }
                });

                if (existingArticle) {
                    return response.error(res, 'Article with this URL already exists', 409);
                }
            }

            // Parse originalContent if it's a string
            let parsedOriginalContent = originalContent;
            if (typeof originalContent === 'string') {
                try {
                    parsedOriginalContent = JSON.parse(originalContent);
                } catch (error) {
                    return response.error(res, 'Invalid JSON format for originalContent', 400);
                }
            }

            const articleData = {
                title,
                url,
                source,
                originalContent: parsedOriginalContent || {},
                summaryArabic,
                summaryEnglish,
                categoryId,
                pinned,
                publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
                userId: req.user.id // Admin who created the article
            };

            // Handle image upload if provided
            if (req.file) {
                try {
                    const imageData = await cloudinaryService.uploadImage(
                        req.file.buffer,
                        req.file.originalname,
                        'articles'
                    );
                    articleData.image = imageData.url;
                    articleData.imageKey = imageData.key;
                } catch (uploadError) {
                    logger.error('Article image upload error:', { error: uploadError.message, userId: req.user.id });
                    return response.error(res, 'Failed to upload image', 400);
                }
            }

            const article = await prisma.article.create({
                data: articleData,
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            type: true
                        }
                    },
                    author: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    _count: {
                        select: {
                            comments: true,
                            favorites: true
                        }
                    }
                }
            });

            return response.success(res, { article }, 'Article created successfully', 201);
        } catch (error) {
            logger.error('Create Article error:', { error: error.message, userId: req.user?.id });
            return response.error(res, 'Article creation failed', 500, error.message);
        }
    }

    async getAllArticles(req, res) {
        try {
            const { page = 1, limit = 10, categoryId, pinned, search, status, trackViews = false } = req.query;
            const { skip, take } = pagination.getPaginationParams(req.query, { 
                defaultLimit: 10, 
                maxLimit: 200 // Increased max limit to allow for 50+ items per page
            });

            const where = {};
            
            if (categoryId) where.categoryId = categoryId;
            if (pinned !== undefined) where.pinned = pinned === 'true';
            
            if (search) {
                where.OR = [
                    { title: { contains: search, mode: 'insensitive' } },
                    { source: { contains: search, mode: 'insensitive' } },
                    { summaryArabic: { contains: search, mode: 'insensitive' } },
                    { summaryEnglish: { contains: search, mode: 'insensitive' } },
                    { url: { contains: search, mode: 'insensitive' } }
                ];
            }

            const [articles, total] = await Promise.all([
                prisma.article.findMany({
                    where,
                    skip,
                    take,
                    include: {
                        category: {
                            select: {
                                id: true,
                                name: true,
                                type: true
                            }
                        },
                        author: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        },
                        _count: {
                            select: {
                                comments: { where: { isDeleted: false } },
                                favorites: true,
                                readLater: true
                            }
                        },
                        // Include user-specific data if authenticated
                        ...(req.user && {
                            favorites: {
                                where: { userId: req.user.id },
                                select: { id: true }
                            },
                            readLater: {
                                where: { userId: req.user.id },
                                select: { id: true }
                            }
                        })
                    },
                    orderBy: [
                        { pinned: 'desc' },
                        { publishedAt: 'desc' },
                        { createdAt: 'desc' }
                    ]
                }),
                prisma.article.count({ where })
            ]);

            // Add user-specific flags to articles if authenticated
            const articlesWithUserData = req.user ? articles.map(article => ({
                ...article,
                isFavorited: article.favorites && article.favorites.length > 0,
                isInReadLater: article.readLater && article.readLater.length > 0,
                // Remove the raw favorite/readLater arrays from response
                favorites: undefined,
                readLater: undefined
            })) : articles;

            // Track views for articles if requested (optional - use trackViews=true in query)
            if (trackViews === 'true' && articlesWithUserData.length > 0) {
                try {
                    const viewContext = req.clientInfo ? req.clientInfo.getViewContext() : {
                        userId: req.user?.id || null,
                        userRole: req.user?.role || null,
                        ipAddress: req.ip || 'unknown',
                        userAgent: req.headers['user-agent'] || 'unknown',
                        referer: req.headers.referer || req.headers.referrer || null,
                        isMobile: false,
                        isBot: false
                    };

                    // Track views for all articles in bulk (non-blocking)
                    const viewTrackingPromises = articlesWithUserData.map(article => 
                        viewTrackingService.trackArticleView(article.id, {
                            ...viewContext,
                            // Add context that this is a bulk view tracking
                            isBulkView: true,
                            viewType: 'list_view'
                        }).catch(error => {
                            // Log error but don't fail the request
                            logger.warn('Bulk view tracking failed for article:', { 
                                error: error.message, 
                                articleId: article.id,
                                userId: req.user?.id
                            });
                        })
                    );

                    // Execute all view tracking in background (don't await)
                    Promise.all(viewTrackingPromises);
                } catch (viewTrackingError) {
                    logger.warn('Bulk view tracking initialization failed:', { 
                        error: viewTrackingError.message,
                        userId: req.user?.id,
                        articleCount: articlesWithUserData.length
                    });
                }
            }

            const paginatedResponse = pagination.createPaginatedResponse(
                articlesWithUserData,
                req.query,
                total,
                {
                    defaultLimit: 10,
                    maxLimit: 200
                }
            );

            // Add custom meta data
            paginatedResponse.meta.totalArticles = total;
            paginatedResponse.meta.pinnedCount = await prisma.article.count({ where: { pinned: true } });
            
            // Add view tracking info to meta if enabled
            if (trackViews === 'true') {
                paginatedResponse.meta.viewTrackingEnabled = true;
                paginatedResponse.meta.trackedArticles = articlesWithUserData.length;
            }

            return response.success(res, paginatedResponse, 'Articles retrieved successfully');
        } catch (error) {
            logger.error('Get Articles error:', { error: error.message, query: req.query });
            return response.error(res, 'Failed to retrieve articles', 500, error.message);
        }
    }

    async getArticleById(req, res) {
        const { id } = req.params;

        try {
            const article = await prisma.article.findUnique({
                where: { id },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            description: true
                        }
                    },
                    author: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    comments: {
                        where: { isDeleted: false },
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    image: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' }
                    },
                    _count: {
                        select: {
                            comments: { where: { isDeleted: false } },
                            favorites: true,
                            readLater: true
                        }
                    },
                    // Include user-specific data if authenticated
                    ...(req.user && {
                        favorites: {
                            where: { userId: req.user.id },
                            select: { id: true }
                        },
                        readLater: {
                            where: { userId: req.user.id },
                            select: { id: true }
                        }
                    })
                }
            });

            if (!article) {
                return response.notFound(res, 'Article not found');
            }

            // Add user-specific flags if authenticated
            if (req.user) {
                article.isFavorited = article.favorites && article.favorites.length > 0;
                article.isInReadLater = article.readLater && article.readLater.length > 0;
                // Remove the raw arrays from response
                delete article.favorites;
                delete article.readLater;
            }

            // Track article view with sophisticated logic
            try {
                await viewTrackingService.trackArticleView(
                    article.id, 
                    req.clientInfo ? req.clientInfo.getViewContext() : {
                        userId: req.user?.id || null,
                        userRole: req.user?.role || null,
                        ipAddress: req.ip || 'unknown',
                        userAgent: req.headers['user-agent'] || 'unknown',
                        referer: req.headers.referer || req.headers.referrer || null,
                        isMobile: false,
                        isBot: false
                    }
                );
            } catch (viewTrackingError) {
                // Log error but don't fail the request
                logger.warn('View tracking failed:', { 
                    error: viewTrackingError.message, 
                    articleId: article.id,
                    userId: req.user?.id
                });
            }

            return response.success(res, { article }, 'Article retrieved successfully');
        } catch (error) {
            logger.error('Get Article error:', { error: error.message, articleId: req.params.id });
            return response.error(res, 'Failed to retrieve article', 500, error.message);
        }
    }

    async updateArticle(req, res) {
        const { id } = req.params;
        const { 
            title, 
            url, 
            source, 
            originalContent, 
            summaryArabic, 
            summaryEnglish, 
            categoryId, 
            pinned,
            publishedAt 
        } = req.body;

        try {
            const existingArticle = await prisma.article.findUnique({
                where: { id }
            });

            if (!existingArticle) {
                return response.notFound(res, 'Article not found');
            }

            // Validate category if provided
            if (categoryId) {
                const category = await prisma.category.findUnique({
                    where: { id: categoryId }
                });

                if (!category) {
                    return response.notFound(res, 'Category not found');
                }
            }

            // Check for URL conflicts only if URL is provided and changed
            if (url && url !== existingArticle.url) {
                const conflictingArticle = await prisma.article.findFirst({
                    where: {
                        AND: [
                            { id: { not: id } },
                            { url }
                        ]
                    }
                });

                if (conflictingArticle) {
                    return response.error(res, 'Article with this URL already exists', 409);
                }
            }

            // Parse originalContent if it's a string
            let parsedOriginalContent = originalContent;
            if (originalContent && typeof originalContent === 'string') {
                try {
                    parsedOriginalContent = JSON.parse(originalContent);
                } catch (error) {
                    return response.error(res, 'Invalid JSON format for originalContent', 400);
                }
            }

            const data = {};
            if (title !== undefined) data.title = title;
            if (url !== undefined) data.url = url;
            if (source !== undefined) data.source = source;
            if (originalContent !== undefined) data.originalContent = parsedOriginalContent;
            if (summaryArabic !== undefined) data.summaryArabic = summaryArabic;
            if (summaryEnglish !== undefined) data.summaryEnglish = summaryEnglish;
            if (categoryId !== undefined) data.categoryId = categoryId;
            if (pinned !== undefined) data.pinned = pinned;
            if (publishedAt !== undefined) data.publishedAt = new Date(publishedAt);

            // Handle image upload and replacement
            if (req.file) {
                // Delete old image if exists
                if (existingArticle.imageKey) {
                    try {
                        await cloudinaryService.deleteFile(existingArticle.imageKey);
                    } catch (deleteError) {
                        logger.error('Failed to delete old article image from Cloudinary:', { error: deleteError?.message || deleteError });
                    }
                }

                try {
                    const imageData = await cloudinaryService.uploadImage(
                        req.file.buffer,
                        req.file.originalname,
                        'articles'
                    );
                    data.image = imageData.url;
                    data.imageKey = imageData.key;
                } catch (uploadError) {
                    logger.error('Article image upload error:', { error: uploadError?.message || uploadError });
                    return response.error(res, 'Failed to upload new image', 400);
                }
            }

            const updatedArticle = await prisma.article.update({
                where: { id },
                data,
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            type: true
                        }
                    },
                    author: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    _count: {
                        select: {
                            comments: true,
                            favorites: true,
                            readLater: true
                        }
                    }
                }
            });

            return response.success(res, { article: updatedArticle }, 'Article updated successfully');
        } catch (error) {
            logger.error('Update Article error:', { error: error?.message || error });
            if (error.code === 'P2025') {
                return response.notFound(res, 'Article not found');
            }
            return response.error(res, 'Article update failed', 500, error.message);
        }
    }

    async deleteArticle(req, res) {
        const { id } = req.params;

        try {
            const existingArticle = await prisma.article.findUnique({
                where: { id }
            });

            if (!existingArticle) {
                return response.notFound(res, 'Article not found');
            }

            // Delete image from Cloudinary if exists
            if (existingArticle.imageKey) {
                try {
                    await cloudinaryService.deleteFile(existingArticle.imageKey);
                } catch (deleteError) {
                    logger.error('Failed to delete article image from Cloudinary:', { error: deleteError?.message || deleteError });
                }
            }

            await prisma.article.delete({
                where: { id }
            });

            return response.success(res, null, 'Article deleted successfully');
        } catch (error) {
            logger.error('Delete Article error:', { error: error?.message || error });
            if (error.code === 'P2025') {
                return response.notFound(res, 'Article not found');
            }
            return response.error(res, 'Article deletion failed', 500, error.message);
        }
    }

    async togglePinArticle(req, res) {
        const { id } = req.params;

        try {
            const existingArticle = await prisma.article.findUnique({
                where: { id }
            });

            if (!existingArticle) {
                return response.notFound(res, 'Article not found');
            }

            const updatedArticle = await prisma.article.update({
                where: { id },
                data: { pinned: !existingArticle.pinned },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            type: true
                        }
                    },
                    author: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                }
            });

            const action = updatedArticle.pinned ? 'pinned' : 'unpinned';
            return response.success(res, { article: updatedArticle }, `Article ${action} successfully`);
        } catch (error) {
            logger.error('Toggle Pin Article error:', { error: error?.message || error });
            return response.error(res, 'Failed to toggle pin status', 500, error.message);
        }
    }

    async getArticleStats(req, res) {
        try {
            const stats = await Promise.all([
                prisma.article.count(),
                prisma.article.count({ where: { pinned: true } }),
                prisma.article.aggregate({
                    _sum: { viewCount: true },
                    _avg: { viewCount: true }
                }),
                prisma.article.groupBy({
                    by: ['categoryId'],
                    _count: {
                        categoryId: true
                    },
                    orderBy: {
                        _count: {
                            categoryId: 'desc'
                        }
                    },
                    take: 5
                })
            ]);

            const [total, pinned, viewStats, topCategories] = stats;

            // Get category names for top categories
            const categoryIds = topCategories.map(cat => cat.categoryId).filter(Boolean);
            const categories = await prisma.category.findMany({
                where: { id: { in: categoryIds } },
                select: { id: true, name: true }
            });

            const categoriesWithCounts = topCategories.map(cat => ({
                category: categories.find(c => c.id === cat.categoryId) || { id: cat.categoryId, name: 'Uncategorized' },
                count: cat._count.categoryId
            }));

            const articleStats = {
                total,
                pinned,
                totalViews: viewStats._sum.viewCount || 0,
                averageViews: Math.round(viewStats._avg.viewCount || 0),
                topCategories: categoriesWithCounts
            };

            return response.success(res, articleStats, 'Article statistics retrieved successfully');
        } catch (error) {
            logger.error('Get Article Stats error:', { error: error?.message || error });
            return response.error(res, 'Failed to retrieve article statistics', 500, error.message);
        }
    }

    /**
     * Get detailed view statistics for an article
     */
    async getArticleViewStats(req, res) {
        const { id } = req.params;
        const { period = '30d' } = req.query;

        try {
            const article = await prisma.article.findUnique({
                where: { id },
                select: { id: true, title: true }
            });

            if (!article) {
                return response.notFound(res, 'Article not found');
            }

            const viewStats = await viewTrackingService.getArticleViewStats(id, period);
            
            return response.success(res, {
                article,
                period,
                ...viewStats
            }, 'Article view statistics retrieved successfully');
        } catch (error) {
            logger.error('Get Article View Stats error:', { 
                error: error.message, 
                articleId: req.params.id,
                period: req.query.period
            });
            return response.error(res, 'Failed to retrieve article view statistics', 500, error.message);
        }
    }

    /**
     * Get trending articles based on recent views
     */
    async getTrendingArticles(req, res) {
        try {
            const { period = '7d' } = req.query;
            const { skip, take, page, limit } = pagination.getPaginationParams(req.query, { 
                defaultLimit: 10, 
                maxLimit: 50
            });

            // Get trending articles from the service
            const result = await viewTrackingService.getTrendingArticles({
                period,
                limit: take,
                offset: skip
            });

            // The service should return { articles, totalCount }
            const articles = result.articles || result;
            const totalCount = result.totalCount || articles.length;

            // Create pagination response
            const paginationInfo = pagination.createPaginationResponse(page, limit, totalCount);

            return response.success(res, {
                articles,
                period,
                pagination: paginationInfo,
                meta: {
                    totalArticles: totalCount,
                    pageArticles: articles.length,
                    timePeriod: period
                }
            }, 'Trending articles retrieved successfully');
        } catch (error) {
            logger.error('Get Trending Articles error:', { 
                error: error.message, 
                query: req.query 
            });
            return response.error(res, 'Failed to retrieve trending articles', 500, error.message);
        }
    }

    /**
     * Get overall view analytics dashboard data
     */
    async getViewAnalytics(req, res) {
        try {
            const { period = '30d' } = req.query;

            // Get total views across all articles
            const totalViewsResult = await prisma.articleView.aggregate({
                _count: { id: true },
                where: period !== 'all' ? {
                    viewedAt: {
                        gte: viewTrackingService.getPeriodStartDate(period)
                    }
                } : {}
            });

            // Get unique viewers (registered users + unique IPs)
            const uniqueUsersResult = await prisma.articleView.findMany({
                where: period !== 'all' ? {
                    viewedAt: {
                        gte: viewTrackingService.getPeriodStartDate(period)
                    }
                } : {},
                select: { userId: true, ipAddress: true },
                distinct: ['userId', 'ipAddress']
            });

            // Get most viewed articles
            const mostViewedArticles = await prisma.articleView.groupBy({
                by: ['articleId'],
                _count: { id: true },
                where: period !== 'all' ? {
                    viewedAt: {
                        gte: viewTrackingService.getPeriodStartDate(period)
                    }
                } : {},
                orderBy: { _count: { id: 'desc' } },
                take: 10
            });

            // Fetch article details for most viewed
            const articleIds = mostViewedArticles.map(item => item.articleId);
            const articlesDetails = await prisma.article.findMany({
                where: { id: { in: articleIds } },
                select: {
                    id: true,
                    title: true,
                    url: true,
                    createdAt: true,
                    category: {
                        select: { name: true }
                    }
                }
            });

            const mostViewedWithDetails = mostViewedArticles.map(item => ({
                article: articlesDetails.find(a => a.id === item.articleId),
                viewCount: item._count.id
            }));

            // Get views by day for the period (for charts)
            const viewsByDay = await prisma.$queryRaw`
                SELECT 
                    DATE("viewedAt") as date,
                    COUNT(*) as views,
                    COUNT(DISTINCT CASE WHEN "userId" IS NOT NULL THEN "userId" END) as registered_views,
                    COUNT(DISTINCT CASE WHEN "userId" IS NULL THEN "ipAddress" END) as anonymous_views
                FROM article_views 
                WHERE "viewedAt" >= ${viewTrackingService.getPeriodStartDate(period)}
                GROUP BY DATE("viewedAt")
                ORDER BY date DESC
                LIMIT 30
            `;

            const analytics = {
                period,
                summary: {
                    totalViews: totalViewsResult._count.id,
                    uniqueViewers: uniqueUsersResult.length,
                    registeredViewers: uniqueUsersResult.filter(u => u.userId).length,
                    anonymousViewers: uniqueUsersResult.filter(u => !u.userId).length
                },
                mostViewedArticles: mostViewedWithDetails,
                viewsByDay: viewsByDay.map(row => ({
                    date: row.date,
                    views: Number(row.views),
                    registeredViews: Number(row.registered_views),
                    anonymousViews: Number(row.anonymous_views)
                }))
            };

            return response.success(res, analytics, 'View analytics retrieved successfully');
        } catch (error) {
            logger.error('Get View Analytics error:', { 
                error: error.message, 
                query: req.query 
            });
            return response.error(res, 'Failed to retrieve view analytics', 500, error.message);
        }
    }

    /**
     * Toggle favorite status for an article (add/remove from favorites)
     * POST /api/articles/:id/toggle-favorite
     */
    async toggleFavorite(req, res) {
        const { id } = req.params;
        const userId = req.user.id;

        try {
            // Check if article exists
            const article = await prisma.article.findUnique({
                where: { id },
                select: { id: true, title: true }
            });

            if (!article) {
                return response.notFound(res, 'Article not found');
            }

            // Check if already favorited
            const existingFavorite = await prisma.favorite.findFirst({
                where: {
                    userId,
                    articleId: id
                }
            });

            let isFavorited = false;
            let message = '';

            if (existingFavorite) {
                // Remove from favorites
                await prisma.favorite.delete({
                    where: { id: existingFavorite.id }
                });
                message = 'Article removed from favorites';
                isFavorited = false;
            } else {
                // Add to favorites
                await prisma.favorite.create({
                    data: {
                        userId,
                        articleId: id
                    }
                });
                message = 'Article added to favorites';
                isFavorited = true;
            }

            logger.info(`Favorite toggled: ${isFavorited ? 'added' : 'removed'}`, {
                userId,
                articleId: id,
                action: isFavorited ? 'add' : 'remove'
            });

            return response.success(res, {
                isFavorited,
                article: {
                    id: article.id,
                    title: article.title
                }
            }, message);

        } catch (error) {
            logger.error('Toggle favorite error:', {
                error: error.message,
                userId,
                articleId: id
            });
            return response.error(res, 'Failed to toggle favorite status', 500, error.message);
        }
    }

    /**
     * Toggle read later status for an article (add/remove from read later)
     * POST /api/articles/:id/toggle-read-later
     */
    async toggleReadLater(req, res) {
        const { id } = req.params;
        const userId = req.user.id;

        try {
            // Check if article exists
            const article = await prisma.article.findUnique({
                where: { id },
                select: { id: true, title: true }
            });

            if (!article) {
                return response.notFound(res, 'Article not found');
            }

            // Check if already in read later
            const existingReadLater = await prisma.readLater.findFirst({
                where: {
                    userId,
                    articleId: id
                }
            });

            let isInReadLater = false;
            let message = '';

            if (existingReadLater) {
                // Remove from read later
                await prisma.readLater.delete({
                    where: { id: existingReadLater.id }
                });
                message = 'Article removed from read later';
                isInReadLater = false;
            } else {
                // Add to read later
                await prisma.readLater.create({
                    data: {
                        userId,
                        articleId: id
                    }
                });
                message = 'Article added to read later';
                isInReadLater = true;
            }

            logger.info(`Read later toggled: ${isInReadLater ? 'added' : 'removed'}`, {
                userId,
                articleId: id,
                action: isInReadLater ? 'add' : 'remove'
            });

            return response.success(res, {
                isInReadLater,
                article: {
                    id: article.id,
                    title: article.title
                }
            }, message);

        } catch (error) {
            logger.error('Toggle read later error:', {
                error: error.message,
                userId,
                articleId: id
            });
            return response.error(res, 'Failed to toggle read later status', 500, error.message);
        }
    }

    /**
     * Get user's favorite articles
     * GET /api/articles/favorites
     */
    async getUserFavorites(req, res) {
        const userId = req.user.id;

        try {
            const { skip, take } = pagination.getPaginationParams(req.query, {
                defaultLimit: 10,
                maxLimit: 100
            });

            const [favorites, total] = await Promise.all([
                prisma.favorite.findMany({
                    where: { userId },
                    skip,
                    take,
                    include: {
                        article: {
                            include: {
                                category: {
                                    select: {
                                        id: true,
                                        name: true,
                                        type: true
                                    }
                                },
                                author: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true
                                    }
                                },
                                _count: {
                                    select: {
                                        comments: { where: { isDeleted: false } },
                                        favorites: true,
                                        readLater: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.favorite.count({ where: { userId } })
            ]);

            const articles = favorites.map(fav => ({
                ...fav.article,
                favoritedAt: fav.createdAt
            }));

            const paginatedResponse = pagination.createPaginatedResponse(
                articles,
                req.query,
                total,
                {
                    defaultLimit: 10,
                    maxLimit: 100
                }
            );

            paginatedResponse.meta.totalFavorites = total;

            return response.success(res, paginatedResponse, 'Favorite articles retrieved successfully');

        } catch (error) {
            logger.error('Get user favorites error:', {
                error: error.message,
                userId
            });
            return response.error(res, 'Failed to retrieve favorite articles', 500, error.message);
        }
    }

    /**
     * Get user's read later articles
     * GET /api/articles/read-later
     */
    async getUserReadLater(req, res) {
        const userId = req.user.id;

        try {
            const { skip, take } = pagination.getPaginationParams(req.query, {
                defaultLimit: 10,
                maxLimit: 100
            });

            const [readLaterItems, total] = await Promise.all([
                prisma.readLater.findMany({
                    where: { userId },
                    skip,
                    take,
                    include: {
                        article: {
                            include: {
                                category: {
                                    select: {
                                        id: true,
                                        name: true,
                                        type: true
                                    }
                                },
                                author: {
                                    select: {
                                        id: true,
                                        name: true,
                                        email: true
                                    }
                                },
                                _count: {
                                    select: {
                                        comments: { where: { isDeleted: false } },
                                        favorites: true,
                                        readLater: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.readLater.count({ where: { userId } })
            ]);

            const articles = readLaterItems.map(item => ({
                ...item.article,
                addedToReadLaterAt: item.createdAt,
                updatedAt: item.updatedAt
            }));

            const paginatedResponse = pagination.createPaginatedResponse(
                articles,
                req.query,
                total,
                {
                    defaultLimit: 10,
                    maxLimit: 100
                }
            );

            paginatedResponse.meta.totalReadLater = total;

            return response.success(res, paginatedResponse, 'Read later articles retrieved successfully');

        } catch (error) {
            logger.error('Get user read later error:', {
                error: error.message,
                userId
            });
            return response.error(res, 'Failed to retrieve read later articles', 500, error.message);
        }
    }

    /**
     * Get most favorited articles (Admin API)
     * GET /api/articles/admin/favorites-stats
     */
    async getFavoritesStats(req, res) {
        try {
            const { limit = 10 } = req.query;
            const takeLimit = Math.min(parseInt(limit), 50); // Max 50 articles

            // Get most favorited articles
            const mostFavorited = await prisma.favorite.groupBy({
                by: ['articleId'],
                _count: {
                    articleId: true
                },
                orderBy: {
                    _count: {
                        articleId: 'desc'
                    }
                },
                take: takeLimit
            });

            // Get article details
            const articleIds = mostFavorited.map(item => item.articleId);
            const articles = await prisma.article.findMany({
                where: { id: { in: articleIds } },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            type: true
                        }
                    },
                    author: {
                        select: {
                            id: true,
                            name: true,
                            email: true
                        }
                    },
                    _count: {
                        select: {
                            comments: { where: { isDeleted: false } },
                            favorites: true,
                            readLater: true
                        }
                    }
                }
            });

            // Combine data
            const favoritesWithDetails = mostFavorited.map(item => ({
                article: articles.find(a => a.id === item.articleId),
                favoriteCount: item._count.articleId
            }));

            // Get overall stats
            const [totalFavorites, totalUsers, totalArticles] = await Promise.all([
                prisma.favorite.count(),
                prisma.user.count(),
                prisma.article.count()
            ]);

            // Get favorites by category (using a different approach since groupBy can't access relations)
            const favoritesWithCategories = await prisma.favorite.findMany({
                include: {
                    article: {
                        select: {
                            categoryId: true,
                            category: {
                                select: {
                                    name: true
                                }
                            }
                        }
                    }
                }
            });

            // Group by category manually
            const categoryGroups = {};
            favoritesWithCategories.forEach(fav => {
                const categoryId = fav.article.categoryId || 'uncategorized';
                const categoryName = fav.article.category?.name || 'Uncategorized';
                
                if (!categoryGroups[categoryId]) {
                    categoryGroups[categoryId] = {
                        categoryId,
                        categoryName,
                        count: 0
                    };
                }
                categoryGroups[categoryId].count++;
            });

            const favoritesByCategory = Object.values(categoryGroups)
                .sort((a, b) => b.count - a.count)
                .slice(0, 5);

            const stats = {
                summary: {
                    totalFavorites,
                    totalUsers,
                    totalArticles,
                    favoritesRate: totalArticles > 0 ? ((totalFavorites / totalArticles) * 100).toFixed(2) : 0
                },
                mostFavorited: favoritesWithDetails,
                favoritesByCategory: favoritesByCategory
            };

            logger.info('Favorites statistics retrieved', {
                totalFavorites,
                mostFavoritedCount: favoritesWithDetails.length
            });

            return response.success(res, stats, 'Favorites statistics retrieved successfully');

        } catch (error) {
            logger.error('Get favorites stats error:', {
                error: error.message
            });
            return response.error(res, 'Failed to retrieve favorites statistics', 500, error.message);
        }
    }
}

export default ArticleController;
