import prisma from '../prisma/index.js';

import { response, pagination } from '../utils/index.js';
import { cloudinaryService, rssProcessor, rssQueueService } from '../services/index.js';
import RSSFeedChecker from '../utils/rssFeedChecker.js';
import winston from 'winston';


// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] rssFeed Controller: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
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


class RSSFeedController {
    constructor() {
        this.prisma = prisma;
    }

    async createRSSFeed(req, res) {
        const { name, url, status = 'DRAFT', categoryId, subType } = req.body;

        try {
            const category = await prisma.category.findUnique({
                where: { id: categoryId }
            });

            if (!category) {
                return response.notFound(res, 'Category not found');
            }

            const existingRSSFeed = await prisma.rSSFeed.findFirst({
                where: {
                    OR: [
                        { name },
                        { url }
                    ]
                }
            });

            if (existingRSSFeed) {
                if (existingRSSFeed.name === name) {
                    return response.error(res, 'RSS Feed with this name already exists', 409);
                }
                if (existingRSSFeed.url === url) {
                    return response.error(res, 'RSS Feed with this URL already exists', 409);
                }
            }

            const data = {
                name,
                url,
                status,
                categoryId,
                subType
            };

            if (req.file) {
                try {
                    const logoData = await cloudinaryService.uploadImage(
                        req.file.buffer,
                        req.file.originalname,
                        'rssfeeds'
                    );
                    data.logo = logoData.url;
                    data.logoKey = logoData.key;
                } catch (uploadError) {
                    logger.error('RSS Feed logo upload error:', { error: uploadError?.message || uploadError });
                    return response.error(res, 'Failed to upload logo', 400);
                }
            }

            const rssFeed = await prisma.rSSFeed.create({
                data,
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            type: true
                        }
                    }
                }
            });

            return response.success(res, { rssFeed }, 'RSS Feed created successfully', 201);
        } catch (error) {
            logger.error('Create RSS Feed error:', { error: error?.message || error });
            if (error.code === 'P2002') {
                return response.error(res, 'RSS Feed with this URL already exists', 409);
            }
            return response.error(res, 'RSS Feed creation failed', 500, error.message);
        }
    }

    async getAllRSSFeeds(req, res) {
        try {
            const { page = 1, limit = 10, status, categoryId, subType, search } = req.query;
            const { skip, take } = pagination.getPaginationParams(req.query, { 
                defaultLimit: 10, 
                maxLimit: 200 
            });

            const where = {};
            if (status) where.status = status;
            if (categoryId) where.categoryId = categoryId;
            if (subType) where.subType = subType;
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { url: { contains: search, mode: 'insensitive' } }
                ];
            }

            const [rssFeeds, total] = await Promise.all([
                prisma.rSSFeed.findMany({
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
                        }
                    },
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.rSSFeed.count({ where })
            ]);

            // Add active status to RSS feeds
            const rssFeedsWithActiveStatus = await RSSFeedChecker.addActiveStatus(rssFeeds);

            const paginatedResponse = pagination.createPaginatedResponse(
                rssFeedsWithActiveStatus,
                total,
                page,
                limit,
                {
                    totalFeeds: total,
                    currentPage: page
                }
            );

            return response.success(res, paginatedResponse, 'RSS Feeds retrieved successfully');
        } catch (error) {
            logger.error('Get RSS Feeds error:', { error: error?.message || error });
            return response.error(res, 'Failed to retrieve RSS Feeds', 500, error.message);
        }
    }

    async getRSSFeedById(req, res) {
        const { id } = req.params;

        try {
            const rssFeed = await prisma.rSSFeed.findUnique({
                where: { id },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            type: true,
                            description: true
                        }
                    }
                }
            });

            if (!rssFeed) {
                return response.notFound(res, 'RSS Feed not found');
            }

            // Add active status to single RSS feed
            const [rssFeedWithActiveStatus] = await RSSFeedChecker.addActiveStatus([rssFeed]);

            return response.success(res, { rssFeed: rssFeedWithActiveStatus }, 'RSS Feed retrieved successfully');
        } catch (error) {
            logger.error('Get RSS Feed by ID error:', { error: error?.message || error });
            return response.error(res, 'Failed to retrieve RSS Feed', 500, error.message);
        }
    }

    async updateRSSFeed(req, res) {
        const { id } = req.params;
        const { name, url, status, categoryId, subType } = req.body;

        try {
            const existingRSSFeed = await prisma.rSSFeed.findUnique({
                where: { id }
            });

            if (!existingRSSFeed) {
                return response.notFound(res, 'RSS Feed not found');
            }

            if (categoryId) {
                const category = await prisma.category.findUnique({
                    where: { id: categoryId }
                });

                if (!category) {
                    return response.notFound(res, 'Category not found');
                }
            }

            if (name || url) {
                const conflictWhere = {
                    AND: [
                        { id: { not: id } },
                        {
                            OR: []
                        }
                    ]
                };

                if (name) conflictWhere.AND[1].OR.push({ name });
                if (url) conflictWhere.AND[1].OR.push({ url });

                const conflictingRSSFeed = await prisma.rSSFeed.findFirst({
                    where: conflictWhere
                });

                if (conflictingRSSFeed) {
                    if (conflictingRSSFeed.name === name) {
                        return response.error(res, 'RSS Feed with this name already exists', 409);
                    }
                    if (conflictingRSSFeed.url === url) {
                        return response.error(res, 'RSS Feed with this URL already exists', 409);
                    }
                }
            }

            const data = {};
            if (name !== undefined) data.name = name;
            if (url !== undefined) data.url = url;
            if (status !== undefined) data.status = status;
            if (categoryId !== undefined) data.categoryId = categoryId;
            if (subType !== undefined) data.subType = subType;

            if (req.file) {
                if (existingRSSFeed.logoKey) {
                    try {
                        await cloudinaryService.deleteFile(existingRSSFeed.logoKey);
                    } catch (deleteError) {
                        logger.error('Failed to delete old RSS Feed logo from Cloudinary:', { error: deleteError?.message || deleteError });
                    }
                }

                try {
                    const logoData = await cloudinaryService.uploadImage(
                        req.file.buffer,
                        req.file.originalname,
                        'rssfeeds'
                    );
                    data.logo = logoData.url;
                    data.logoKey = logoData.key;
                } catch (uploadError) {
                    logger.error('RSS Feed logo upload error:', { error: uploadError?.message || uploadError });
                    return response.error(res, 'Failed to upload new logo', 400);
                }
            }

            const updatedRSSFeed = await prisma.rSSFeed.update({
                where: { id },
                data,
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            type: true
                        }
                    }
                }
            });

            return response.success(res, { rssFeed: updatedRSSFeed }, 'RSS Feed updated successfully');
        } catch (error) {
            logger.error('Update RSS Feed error:', { error: error?.message || error });
            if (error.code === 'P2025') {
                return response.notFound(res, 'RSS Feed not found');
            }
            return response.error(res, 'RSS Feed update failed', 500, error.message);
        }
    }

    async deleteRSSFeed(req, res) {
        const { id } = req.params;

        try {
            const existingRSSFeed = await prisma.rSSFeed.findUnique({
                where: { id }
            });

            if (!existingRSSFeed) {
                return response.notFound(res, 'RSS Feed not found');
            }

            if (existingRSSFeed.logoKey) {
                try {
                    await cloudinaryService.deleteFile(existingRSSFeed.logoKey);
                } catch (deleteError) {
                    logger.error('Failed to delete RSS Feed logo from Cloudinary:', { error: deleteError?.message || deleteError });
                }
            }

            await prisma.rSSFeed.delete({
                where: { id }
            });

            return response.success(res, null, 'RSS Feed deleted successfully');
        } catch (error) {
            logger.error('Delete RSS Feed error:', { error: error?.message || error });
            if (error.code === 'P2025') {
                return response.notFound(res, 'RSS Feed not found');
            }
            return response.error(res, 'RSS Feed deletion failed', 500, error.message);
        }
    }

    async processRSSFeed(req, res) {
        const { id } = req.params;

        try {
            const existingRSSFeed = await prisma.rSSFeed.findUnique({
                where: { id },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            type: true
                        }
                    }
                }
            });

            if (!existingRSSFeed) {
                return response.notFound(res, 'RSS Feed not found');
            }

            if (existingRSSFeed.status !== 'PUBLISH') {
                return response.error(res, 'RSS Feed must be published to process articles', 400);
            }

            logger.info('Processing RSS Feed: ${existingRSSFeed.name}');

            // Process the RSS feed
            const result = await rssProcessor.processRSSFeed(id);

            if (result.success) {
                return response.success(res, {
                    rssFeed: existingRSSFeed,
                    processingResult: result
                }, `RSS Feed processed successfully: ${result.processed} articles created, ${result.duplicates} duplicates found`);
            } else {
                return response.error(res, `RSS Feed processing failed: ${result.message}`, 500);
            }

        } catch (error) {
            logger.error('Process RSS Feed error:', { error: error?.message || error });
            return response.error(res, 'RSS Feed processing failed', 500, error.message);
        }
    }

    async processAllRSSFeeds(req, res) {
        try {
            logger.info('Starting batch RSS processing for all feeds...');

            // Process all RSS feeds
            const result = await rssProcessor.processAllRSSFeeds();

            return response.success(res, {
                processingResult: result
            }, `Batch RSS processing completed: ${result.totalArticles} articles created from ${result.processedFeeds}/${result.totalFeeds} feeds`);

        } catch (error) {
            logger.error('Process All RSS Feeds error:', { error: error?.message || error });
            return response.error(res, 'Batch RSS Feed processing failed', 500, error.message);
        }
    }

    async getRSSProcessingStats(req, res) {
        try {
            // Get RSS processing statistics
            const [
                totalRSSFeeds,
                publishedRSSFeeds,
                totalArticles,
                rssFeedArticles,
                recentArticles
            ] = await Promise.all([
                prisma.rSSFeed.count(),
                prisma.rSSFeed.count({ where: { status: 'PUBLISH' } }),
                prisma.article.count(),
                prisma.article.count({
                    where: {
                        url: { not: null } // Articles with URLs are likely from RSS
                    }
                }),
                prisma.article.count({
                    where: {
                        AND: [
                            { url: { not: null } },
                            { createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } } // Last 24 hours
                        ]
                    }
                })
            ]);

            const stats = {
                totalRSSFeeds,
                publishedRSSFeeds,
                inactiveRSSFeeds: totalRSSFeeds - publishedRSSFeeds,
                totalArticles,
                rssFeedArticles,
                manualArticles: totalArticles - rssFeedArticles,
                recentRSSArticles: recentArticles
            };

            return response.success(res, stats, 'RSS processing statistics retrieved successfully');

        } catch (error) {
            logger.error('Get RSS Processing Stats error:', { error: error?.message || error });
            return response.error(res, 'Failed to retrieve RSS processing statistics', 500, error.message);
        }
    }

    // Queue-based RSS processing methods

    async queueProcessRSSFeed(req, res) {
        const { id } = req.params;

        try {
            const existingRSSFeed = await prisma.rSSFeed.findUnique({
                where: { id },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true,
                            type: true
                        }
                    }
                }
            });

            if (!existingRSSFeed) {
                return response.notFound(res, 'RSS Feed not found');
            }

            if (existingRSSFeed.status !== 'PUBLISH') {
                return response.error(res, 'RSS Feed must be published to process articles', 400);
            }

            logger.info('Queueing RSS Feed for processing: ${existingRSSFeed.name}');

            // Add to processing queue
            const job = await rssQueueService.processSingleFeed(id, {
                source: 'manual',
                priority: 1 // Higher priority for manual requests
            });

            return response.success(res, {
                rssFeed: existingRSSFeed,
                job: {
                    id: job.id,
                    status: 'queued',
                    priority: job.opts.priority
                }
            }, `RSS Feed queued for processing (Job ID: ${job.id})`);

        } catch (error) {
            logger.error('Queue RSS Feed Processing error:', { error: error?.message || error });
            return response.error(res, 'Failed to queue RSS Feed for processing', 500, error.message);
        }
    }

    async queueProcessAllRSSFeeds(req, res) {
        try {
            logger.info('Queueing batch RSS processing for all feeds...');

            // Add to processing queue
            const job = await rssQueueService.processAllFeeds({
                source: 'manual',
                priority: 2 // Higher priority for manual batch requests
            });

            return response.success(res, {
                job: {
                    id: job.id,
                    status: 'queued',
                    priority: job.opts.priority
                }
            }, `Batch RSS processing queued (Job ID: ${job.id})`);

        } catch (error) {
            logger.error('Queue All RSS Feeds Processing error:', { error: error?.message || error });
            return response.error(res, 'Failed to queue batch RSS processing', 500, error.message);
        }
    }

    async getQueueStatus(req, res) {
        try {
            const [stats, healthStatus, recentJobs] = await Promise.all([
                rssQueueService.getQueueStats(),
                rssQueueService.getHealthStatus(),
                rssQueueService.getRecentJobs('completed', 5)
            ]);

            return response.success(res, {
                queueStats: stats,
                healthStatus,
                recentJobs: recentJobs.map(job => ({
                    id: job.id,
                    name: job.name,
                    data: job.data,
                    finishedOn: job.finishedOn,
                    result: job.returnvalue
                }))
            }, 'RSS queue status retrieved successfully');

        } catch (error) {
            logger.error('Get Queue Status error:', { error: error?.message || error });
            return response.error(res, 'Failed to retrieve queue status', 500, error.message);
        }
    }

    async getFeedsStatus(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                search,
                status,
                categoryId,
                subType,
                dateFrom,
                dateTo,
                sortBy = 'createdAt',
                sortOrder = 'desc'
            } = req.query;

            const { skip, take } = pagination.getPaginationParams(req.query, {
                defaultLimit: 10,
                maxLimit: 100
            });

            // Build where clause for feeds
            const where = {};
            
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { url: { contains: search, mode: 'insensitive' } }
                ];
            }
            
            if (status) where.status = status;
            if (categoryId) where.categoryId = categoryId;
            if (subType) where.subType = subType;

            // Date range filters
            if (dateFrom || dateTo) {
                where.createdAt = {};
                if (dateFrom) {
                    where.createdAt.gte = new Date(dateFrom);
                }
                if (dateTo) {
                    const toDate = new Date(dateTo);
                    toDate.setHours(23, 59, 59, 999);
                    where.createdAt.lte = toDate;
                }
            }

            // Dynamic sorting
            const buildOrderBy = () => {
                const validSortFields = ['name', 'status', 'createdAt', 'updatedAt'];
                const validSortOrders = ['asc', 'desc'];

                const field = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
                const order = validSortOrders.includes(sortOrder.toLowerCase()) ? sortOrder.toLowerCase() : 'desc';

                return { [field]: order };
            };

            // Get feeds with their article counts and status
            const [feeds, total] = await Promise.all([
                prisma.rSSFeed.findMany({
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
                        }
                    },
                    orderBy: buildOrderBy()
                }),
                prisma.rSSFeed.count({ where })
            ]);

            // Get article counts for each feed
            const feedsWithStats = await Promise.all(
                feeds.map(async (feed) => {
                    // Get total articles that are directly linked to this RSS feed
                    const articleWhere = {
                        rssFeedId: feed.id // Direct relationship lookup
                    };

                    // Get only total article count
                    const totalArticles = await prisma.article.count({ where: articleWhere });

                    return {
                        ...feed,
                        totalArticles
                    };
                })
            );

            // Calculate overall statistics
            const overallStats = {
                totalFeeds: total,
                activeFeeds: feedsWithStats.filter(f => f.status === 'PUBLISH').length,
                totalArticlesFromFeeds: feedsWithStats.reduce((sum, f) => sum + f.totalArticles, 0)
            };

            // Create paginated response
            const paginatedResponse = pagination.createPaginatedResponse(
                feedsWithStats,
                req.query,
                total,
                { defaultLimit: 10, maxLimit: 100 }
            );

            // Add metadata
            paginatedResponse.meta = {
                ...paginatedResponse.meta,
                overallStats,
                filters: {
                    search: search || null,
                    status: status || null,
                    categoryId: categoryId || null,
                    subType: subType || null,
                    dateFrom: dateFrom || null,
                    dateTo: dateTo || null,
                    sortBy,
                    sortOrder
                }
            };

            return response.success(res, paginatedResponse, 'RSS feeds status retrieved successfully');

        } catch (error) {
            logger.error('Get Feeds Status error:', { error: error?.message || error });
            return response.error(res, 'Failed to retrieve feeds status', 500, error.message);
        }
    }

    async getJobStatus(req, res) {
        const { jobId } = req.params;

        try {
            const job = await rssQueueService.rssQueue.getJob(jobId);

            if (!job) {
                return response.notFound(res, 'Job not found');
            }

            const jobStatus = await job.getState();
            const jobProgress = job.progress();

            return response.success(res, {
                job: {
                    id: job.id,
                    name: job.name,
                    data: job.data,
                    status: jobStatus,
                    progress: jobProgress,
                    createdAt: new Date(job.timestamp),
                    processedOn: job.processedOn ? new Date(job.processedOn) : null,
                    finishedOn: job.finishedOn ? new Date(job.finishedOn) : null,
                    failedReason: job.failedReason,
                    result: job.returnvalue
                }
            }, `Job status retrieved successfully`);

        } catch (error) {
            logger.error('Get Job Status error:', { error: error?.message || error });
            return response.error(res, 'Failed to retrieve job status', 500, error.message);
        }
    }

    async pauseQueue(req, res) {
        try {
            await rssQueueService.pauseQueue();
            return response.success(res, null, 'RSS processing queue paused');
        } catch (error) {
            logger.error('Pause Queue error:', { error: error?.message || error });
            return response.error(res, 'Failed to pause queue', 500, error.message);
        }
    }

    async resumeQueue(req, res) {
        try {
            await rssQueueService.resumeQueue();
            return response.success(res, null, 'RSS processing queue resumed');
        } catch (error) {
            logger.error('Resume Queue error:', { error: error?.message || error });
            return response.error(res, 'Failed to resume queue', 500, error.message);
        }
    }

    async getQueueJobs(req, res) {
        try {
            const { status = 'completed', limit = 10 } = req.query;
            
            const jobs = await rssQueueService.getRecentJobs(status, parseInt(limit));

            return response.success(res, {
                jobs: jobs.map(job => ({
                    id: job.id,
                    name: job.name,
                    data: job.data,
                    progress: job.progress,
                    timestamp: job.timestamp,
                    processedOn: job.processedOn,
                    finishedOn: job.finishedOn,
                    failedReason: job.failedReason,
                    result: job.returnvalue
                })),
                status,
                count: jobs.length
            }, `${status} jobs retrieved successfully`);

        } catch (error) {
            logger.error('Get Queue Jobs error:', { error: error?.message || error });
            return response.error(res, 'Failed to retrieve queue jobs', 500, error.message);
        }
    }
}

export default RSSFeedController;
