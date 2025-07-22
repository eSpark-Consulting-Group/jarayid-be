import { PrismaClient } from '@prisma/client';
import winston from 'winston';

// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] View Tracker: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
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

class ViewTrackingService {
    /**
     * Track article view with comprehensive logic
     * @param {string} articleId - Article ID
     * @param {Object} viewContext - View context information
     * @returns {Promise<Object>} View tracking result
     */
    async trackArticleView(articleId, viewContext = {}) {
        const {
            userId = null,        // Logged-in user ID (null for anonymous)
            userRole = null,      // User role (ADMIN, USER)
            ipAddress = null,     // Client IP address
            userAgent = null,     // Browser/device info
            isBulkView = false,   // Whether this is part of bulk tracking
            viewType = 'single_view' // Type of view (single_view, list_view, etc.)
        } = viewContext;

        try {
            // Use less verbose logging for bulk operations
            const logLevel = isBulkView ? 'debug' : 'info';
            const logMessage = isBulkView 
                ? `📊 Bulk tracking view for article: ${articleId}`
                : `📊 Tracking view for article: ${articleId}`;

            logger[logLevel](logMessage, {
                userId: userId || 'anonymous',
                userRole,
                ipAddress,
                viewType: userId ? (userRole === 'ADMIN' ? 'admin' : 'user') : 'anonymous',
                isBulkView,
                trackingType: viewType
            });

            // Check if article exists
            const article = await prisma.article.findUnique({
                where: { id: articleId },
                select: { id: true, title: true, viewCount: true }
            });

            if (!article) {
                logger.warn(`❌ Article not found: ${articleId}`);
                return {
                    success: false,
                    error: 'Article not found',
                    viewRecorded: false
                };
            }

            // Determine if this is a new view
            let isNewView = false;
            let viewRecord = null;

            if (userId) {
                // For logged-in users (including admins)
                const existingView = await prisma.articleView.findUnique({
                    where: {
                        unique_user_article_view: {
                            articleId,
                            userId
                        }
                    }
                });

                if (!existingView) {
                    // Create new view record
                    viewRecord = await prisma.articleView.create({
                        data: {
                            articleId,
                            userId,
                            ipAddress,
                            userAgent,
                            viewedAt: new Date()
                        }
                    });
                    isNewView = true;
                    logger.info(`✅ New user view recorded: ${userId} (${userRole || 'USER'})`);
                } else {
                    // Update the existing view timestamp
                    viewRecord = await prisma.articleView.update({
                        where: { id: existingView.id },
                        data: { viewedAt: new Date() }
                    });
                    logger.info(`🔄 Updated existing user view: ${userId} (${userRole || 'USER'})`);
                }
            } else {
                // For anonymous users (track by IP)
                if (!ipAddress) {
                    logger.warn(`⚠️ No IP address provided for anonymous view`);
                    // Still increment view count for anonymous without IP
                    isNewView = true;
                } else {
                    const existingView = await prisma.articleView.findUnique({
                        where: {
                            unique_ip_article_view: {
                                articleId,
                                ipAddress
                            }
                        }
                    });

                    if (!existingView) {
                        // Create new anonymous view record
                        viewRecord = await prisma.articleView.create({
                            data: {
                                articleId,
                                userId: null,
                                ipAddress,
                                userAgent,
                                viewedAt: new Date()
                            }
                        });
                        isNewView = true;
                        logger.info(`✅ New anonymous view recorded: ${ipAddress}`);
                    } else {
                        // Update the existing view timestamp
                        viewRecord = await prisma.articleView.update({
                            where: { id: existingView.id },
                            data: { viewedAt: new Date() }
                        });
                        logger.info(`🔄 Updated existing anonymous view: ${ipAddress}`);
                    }
                }
            }

            // Increment article view count if it's a new view
            if (isNewView) {
                await prisma.article.update({
                    where: { id: articleId },
                    data: { viewCount: { increment: 1 } }
                });
                logger.info(`📈 Article view count incremented: ${article.title}`);
            }

            return {
                success: true,
                viewRecorded: isNewView,
                viewType: userId ? (userRole === 'ADMIN' ? 'admin' : 'user') : 'anonymous',
                message: isNewView ? 'New view recorded' : 'Existing view updated',
                data: {
                    articleId,
                    newViewCount: isNewView ? article.viewCount + 1 : article.viewCount,
                    viewRecord
                }
            };

        } catch (error) {
            // Handle unique constraint violations gracefully
            if (error.code === 'P2002') {
                logger.info(`🔄 Concurrent view detected, updating timestamp`);
                return {
                    success: true,
                    viewRecorded: false,
                    viewType: userId ? 'user' : 'anonymous',
                    message: 'View already recorded',
                    data: { articleId }
                };
            }

            logger.error('❌ Error tracking article view:', {
                error: error.message,
                articleId,
                userId,
                ipAddress
            });

            return {
                success: false,
                error: error.message,
                viewRecorded: false
            };
        }
    }

    /**
     * Get view statistics for an article
     * @param {string} articleId - Article ID
     * @returns {Promise<Object>} View statistics
     */
    async getArticleViewStats(articleId) {
        try {
            const [
                totalViews,
                userViews,
                anonymousViews,
                adminViews,
                recentViews,
                viewsByDay
            ] = await Promise.all([
                // Total view count from article table
                prisma.article.findUnique({
                    where: { id: articleId },
                    select: { viewCount: true }
                }),
                // User views (logged-in users)
                prisma.articleView.count({
                    where: { 
                        articleId,
                        userId: { not: null }
                    }
                }),
                // Anonymous views
                prisma.articleView.count({
                    where: { 
                        articleId,
                        userId: null
                    }
                }),
                // Admin views
                prisma.articleView.count({
                    where: {
                        articleId,
                        user: { role: 'ADMIN' }
                    }
                }),
                // Recent views (last 24 hours)
                prisma.articleView.count({
                    where: {
                        articleId,
                        viewedAt: {
                            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                        }
                    }
                }),
                // Views by day (last 7 days)
                prisma.articleView.groupBy({
                    by: ['viewedAt'],
                    where: {
                        articleId,
                        viewedAt: {
                            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
                        }
                    },
                    _count: { id: true }
                })
            ]);

            return {
                success: true,
                data: {
                    totalViews: totalViews?.viewCount || 0,
                    uniqueViews: userViews + anonymousViews,
                    breakdown: {
                        userViews,
                        anonymousViews,
                        adminViews
                    },
                    recent: {
                        last24Hours: recentViews
                    },
                    dailyViews: viewsByDay
                }
            };

        } catch (error) {
            logger.error('❌ Error getting article view stats:', {
                error: error.message,
                articleId
            });

            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get trending articles based on recent views
     * @param {Object} options - Query options
     * @returns {Promise<Object>} Trending articles with total count
     */
    async getTrendingArticles(options = {}) {
        const {
            limit = 10,
            offset = 0,
            period = '7d'
        } = options;

        try {
            // Calculate time period
            const since = this.getPeriodStartDate(period);

            // Get trending article IDs with view counts
            const trending = await prisma.articleView.groupBy({
                by: ['articleId'],
                where: {
                    viewedAt: { gte: since }
                },
                _count: { id: true },
                orderBy: { _count: { id: 'desc' } }
            });

            // Get total count for pagination
            const totalCount = trending.length;

            // Apply pagination to trending results
            const paginatedTrending = trending.slice(offset, offset + limit);

            // Get article details for paginated results
            const articleIds = paginatedTrending.map(t => t.articleId);
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
                            name: true
                        }
                    }
                }
            });

            // Combine trending data with article details, preserving order
            const trendingArticles = paginatedTrending.map(trend => {
                const article = articles.find(a => a.id === trend.articleId);
                return {
                    ...article,
                    recentViews: trend._count.id,
                    trendingScore: trend._count.id // For sorting/display purposes
                };
            }).filter(article => article.id); // Remove any articles that weren't found

            return {
                articles: trendingArticles,
                totalCount,
                period,
                success: true
            };

        } catch (error) {
            logger.error('❌ Error getting trending articles:', {
                error: error.message,
                options
            });

            return {
                articles: [],
                totalCount: 0,
                period,
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get start date for a given period
     * @param {string} period - Period string (1d, 7d, 30d, 90d, 1y, all)
     * @returns {Date} Start date for the period
     */
    getPeriodStartDate(period) {
        const now = new Date();
        
        switch (period) {
            case '1d':
                return new Date(now.getTime() - 24 * 60 * 60 * 1000);
            case '7d':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case '30d':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            case '90d':
                return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
            case '1y':
                return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
            case 'all':
            default:
                return new Date(0); // Beginning of time
        }
    }
}

export default new ViewTrackingService();
