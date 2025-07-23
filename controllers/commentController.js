import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import { response, pagination } from '../utils/index.js';

// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] Comment Controller: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
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

class CommentController {
    constructor() {
        this.prisma = prisma;
    }

    /**
     * Create a new comment on an article
     * Only authenticated users can comment
     */
    async createComment(req, res) {
        const { articleId, content } = req.body;
        const userId = req.user.id;

        try {
            // Verify that the article exists
            const article = await prisma.article.findUnique({
                where: { id: articleId },
                select: { id: true, title: true }
            });

            if (!article) {
                return response.notFound(res, 'Article not found');
            }

            // Check if user is banned
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { id: true, isBanned: true, name: true }
            });

            if (user.isBanned) {
                return response.error(res, 'You are banned from commenting', 403);
            }

            // Create the comment
            const comment = await prisma.comment.create({
                data: {
                    articleId,
                    userId,
                    content: content.trim()
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                            role: true
                        }
                    },
                    article: {
                        select: {
                            id: true,
                            title: true
                        }
                    }
                }
            });

            logger.info('Comment created successfully', { 
                commentId: comment.id, 
                userId, 
                articleId,
                contentLength: content.length
            });

            return response.success(res, { comment }, 'Comment created successfully', 201);
        } catch (error) {
            logger.error('Create comment error:', { 
                error: error.message, 
                userId, 
                articleId,
                contentLength: content?.length
            });
            return response.error(res, 'Failed to create comment', 500, error.message);
        }
    }

    /**
     * Get comments for a specific article with pagination
     */
    async getArticleComments(req, res) {
        const { articleId } = req.params;
        const { page = 1, limit = 10, sortBy = 'newest' } = req.query;

        try {
            // Verify that the article exists
            const article = await prisma.article.findUnique({
                where: { id: articleId },
                select: { id: true, title: true }
            });

            if (!article) {
                return response.notFound(res, 'Article not found');
            }

            const { skip, take } = pagination.getPaginationParams(req.query, { 
                defaultLimit: 10, 
                maxLimit: 100
            });

            const orderBy = sortBy === 'oldest' 
                ? { createdAt: 'asc' } 
                : { createdAt: 'desc' };

            const [comments, total] = await Promise.all([
                prisma.comment.findMany({
                    where: { 
                        articleId,
                        isDeleted: false
                    },
                    skip,
                    take,
                    orderBy,
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                image: true,
                                role: true
                            }
                        }
                    }
                }),
                prisma.comment.count({
                    where: { 
                        articleId,
                        isDeleted: false
                    }
                })
            ]);

            const paginatedResponse = pagination.createPaginatedResponse(
                comments,
                req.query,
                total,
                {
                    defaultLimit: 10,
                    maxLimit: 100
                }
            );

            // Add article info to meta
            paginatedResponse.meta.article = article;
            paginatedResponse.meta.totalComments = total;
            paginatedResponse.meta.sortBy = sortBy;

            return response.success(res, paginatedResponse, 'Comments retrieved successfully');
        } catch (error) {
            logger.error('Get article comments error:', { 
                error: error.message, 
                articleId,
                query: req.query
            });
            return response.error(res, 'Failed to retrieve comments', 500, error.message);
        }
    }

    /**
     * Update a comment (only by the comment author)
     */
    async updateComment(req, res) {
        const { commentId } = req.params;
        const { content } = req.body;
        const userId = req.user.id;

        try {
            // Find the comment and verify ownership
            const existingComment = await prisma.comment.findUnique({
                where: { id: commentId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            isBanned: true
                        }
                    },
                    article: {
                        select: {
                            id: true,
                            title: true
                        }
                    }
                }
            });

            if (!existingComment) {
                return response.notFound(res, 'Comment not found');
            }

            if (existingComment.isDeleted) {
                return response.error(res, 'Comment has been deleted', 410);
            }

            // Check if user owns the comment
            if (existingComment.userId !== userId) {
                return response.error(res, 'You can only edit your own comments', 403);
            }

            // Check if user is banned
            if (existingComment.user.isBanned) {
                return response.error(res, 'You are banned from commenting', 403);
            }

            // Update the comment
            const updatedComment = await prisma.comment.update({
                where: { id: commentId },
                data: {
                    content: content.trim()
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                            role: true
                        }
                    },
                    article: {
                        select: {
                            id: true,
                            title: true
                        }
                    }
                }
            });

            logger.info('Comment updated successfully', { 
                commentId, 
                userId, 
                articleId: updatedComment.articleId,
                contentLength: content.length
            });

            return response.success(res, { comment: updatedComment }, 'Comment updated successfully');
        } catch (error) {
            logger.error('Update comment error:', { 
                error: error.message, 
                commentId, 
                userId,
                contentLength: content?.length
            });
            return response.error(res, 'Failed to update comment', 500, error.message);
        }
    }

    /**
     * Delete a comment (soft delete - only by comment author or admin)
     */
    async deleteComment(req, res) {
        const { commentId } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        try {
            // Find the comment
            const existingComment = await prisma.comment.findUnique({
                where: { id: commentId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    article: {
                        select: {
                            id: true,
                            title: true
                        }
                    }
                }
            });

            if (!existingComment) {
                return response.notFound(res, 'Comment not found');
            }

            if (existingComment.isDeleted) {
                return response.error(res, 'Comment has already been deleted', 410);
            }

            // Check if user owns the comment or is an admin
            const canDelete = existingComment.userId === userId || userRole === 'ADMIN';
            
            if (!canDelete) {
                return response.error(res, 'You can only delete your own comments', 403);
            }

            // Soft delete the comment
            await prisma.comment.update({
                where: { id: commentId },
                data: {
                    isDeleted: true
                }
            });

            logger.info('Comment deleted successfully', { 
                commentId, 
                deletedBy: userId, 
                originalAuthor: existingComment.userId,
                articleId: existingComment.articleId,
                deletedByAdmin: userRole === 'ADMIN' && existingComment.userId !== userId
            });

            return response.success(res, null, 'Comment deleted successfully');
        } catch (error) {
            logger.error('Delete comment error:', { 
                error: error.message, 
                commentId, 
                userId,
                userRole
            });
            return response.error(res, 'Failed to delete comment', 500, error.message);
        }
    }

    /**
     * Get a specific comment by ID
     */
    async getCommentById(req, res) {
        const { commentId } = req.params;

        try {
            const comment = await prisma.comment.findUnique({
                where: { id: commentId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            image: true,
                            role: true
                        }
                    },
                    article: {
                        select: {
                            id: true,
                            title: true,
                            url: true
                        }
                    }
                }
            });

            if (!comment) {
                return response.notFound(res, 'Comment not found');
            }

            if (comment.isDeleted) {
                return response.error(res, 'Comment has been deleted', 410);
            }

            return response.success(res, { comment }, 'Comment retrieved successfully');
        } catch (error) {
            logger.error('Get comment error:', { 
                error: error.message, 
                commentId
            });
            return response.error(res, 'Failed to retrieve comment', 500, error.message);
        }
    }

    /**
     * Get user's own comments across all articles
     */
    async getUserComments(req, res) {
        const userId = req.user.id;
        const { page = 1, limit = 10, includeDeleted = false } = req.query;

        try {
            const { skip, take } = pagination.getPaginationParams(req.query, { 
                defaultLimit: 10, 
                maxLimit: 100
            });

            const whereCondition = {
                userId,
                ...(includeDeleted !== 'true' && { isDeleted: false })
            };

            const [comments, total] = await Promise.all([
                prisma.comment.findMany({
                    where: whereCondition,
                    skip,
                    take,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        article: {
                            select: {
                                id: true,
                                title: true,
                                url: true,
                                category: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    }
                }),
                prisma.comment.count({
                    where: whereCondition
                })
            ]);

            const paginatedResponse = pagination.createPaginatedResponse(
                comments,
                req.query,
                total,
                {
                    defaultLimit: 10,
                    maxLimit: 100
                }
            );

            paginatedResponse.meta.totalComments = total;
            paginatedResponse.meta.includeDeleted = includeDeleted === 'true';

            return response.success(res, paginatedResponse, 'User comments retrieved successfully');
        } catch (error) {
            logger.error('Get user comments error:', { 
                error: error.message, 
                userId,
                query: req.query
            });
            return response.error(res, 'Failed to retrieve user comments', 500, error.message);
        }
    }

    /**
     * Get comment statistics for admin dashboard
     */
    async getCommentStats(req, res) {
        try {
            const stats = await Promise.all([
                // Total comments
                prisma.comment.count(),
                // Active comments (not deleted)
                prisma.comment.count({ where: { isDeleted: false } }),
                // Deleted comments
                prisma.comment.count({ where: { isDeleted: true } }),
                // Comments today
                prisma.comment.count({
                    where: {
                        createdAt: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0))
                        }
                    }
                }),
                // Most active commenters
                prisma.comment.groupBy({
                    by: ['userId'],
                    where: { isDeleted: false },
                    _count: {
                        userId: true
                    },
                    orderBy: {
                        _count: {
                            userId: 'desc'
                        }
                    },
                    take: 5
                }),
                // Most commented articles
                prisma.comment.groupBy({
                    by: ['articleId'],
                    where: { isDeleted: false },
                    _count: {
                        articleId: true
                    },
                    orderBy: {
                        _count: {
                            articleId: 'desc'
                        }
                    },
                    take: 5
                })
            ]);

            const [total, active, deleted, today, topCommenters, topArticles] = stats;

            // Get user details for top commenters
            const userIds = topCommenters.map(c => c.userId);
            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, name: true, image: true }
            });

            const topCommentersWithDetails = topCommenters.map(commenter => ({
                user: users.find(u => u.id === commenter.userId),
                commentCount: commenter._count.userId
            }));

            // Get article details for top articles
            const articleIds = topArticles.map(a => a.articleId);
            const articles = await prisma.article.findMany({
                where: { id: { in: articleIds } },
                select: { 
                    id: true, 
                    title: true, 
                    url: true,
                    category: {
                        select: { name: true }
                    }
                }
            });

            const topArticlesWithDetails = topArticles.map(article => ({
                article: articles.find(a => a.id === article.articleId),
                commentCount: article._count.articleId
            }));

            const commentStats = {
                summary: {
                    total,
                    active,
                    deleted,
                    today,
                    deletionRate: total > 0 ? ((deleted / total) * 100).toFixed(2) : 0
                },
                topCommenters: topCommentersWithDetails,
                topArticles: topArticlesWithDetails
            };

            return response.success(res, commentStats, 'Comment statistics retrieved successfully');
        } catch (error) {
            logger.error('Get comment stats error:', { error: error.message });
            return response.error(res, 'Failed to retrieve comment statistics', 500, error.message);
        }
    }
}

export default CommentController;
