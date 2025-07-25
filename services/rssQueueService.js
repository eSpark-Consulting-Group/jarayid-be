import Queue from 'bull';
import Redis from 'ioredis';
import winston from 'winston';
import { REDIS_CONFIG, RSS_PROCESSING_CONFIG } from '../config/config.js';
import rssProcessor from './rssProcessor.js';
import prisma from '../prisma/index.js';


// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] RSS Queue: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
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

// Redis connection for Bull - Bull has specific requirements for Redis config
const redisConfig = {
    port: REDIS_CONFIG.port,
    host: REDIS_CONFIG.host,
    password: REDIS_CONFIG.password,
    // Bull-specific requirements
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    retryDelayOnFailover: 100,
    family: 4, // Use IPv4
    keepAlive: true,
};

// Create RSS processing queue
const rssQueue = new Queue('RSS Processing', {
    redis: redisConfig,
    defaultJobOptions: {
        removeOnComplete: 50, // Keep last 50 completed jobs
        removeOnFail: 20,     // Keep last 20 failed jobs
        attempts: RSS_PROCESSING_CONFIG.retryAttempts,
        backoff: {
            type: 'exponential',
            delay: RSS_PROCESSING_CONFIG.retryDelay,
        },
        timeout: RSS_PROCESSING_CONFIG.jobTimeout,
    },
});

// Create job results tracking queue
const jobResultsQueue = new Queue('Job Results Tracking', {
    redis: redisConfig,
    defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 2,
    },
});

class RSSQueueService {
    constructor() {
        this.rssQueue = rssQueue;
        this.jobResultsQueue = jobResultsQueue;
        this.isProcessing = false;
        this.setupJobProcessors();
        this.setupEventListeners();
    }

    /**
     * Setup job processors for different job types
     */
    setupJobProcessors() {
        // Process single RSS feed
        this.rssQueue.process('process-single-feed', RSS_PROCESSING_CONFIG.concurrency, async (job) => {
            const { feedId, source } = job.data;
            
            logger.info(`📡 Processing RSS feed job: ${feedId} (${source})`);
            
            try {
                // Update job progress
                await job.progress(10);
                
                const result = await rssProcessor.processRSSFeed(feedId);
                
                await job.progress(90);
                
                // Store job result in database
                await this.storeJobResult({
                    jobId: job.id,
                    jobType: 'single-feed',
                    feedId,
                    result,
                    source: source || 'manual'
                });
                
                await job.progress(100);
                
                return result;
            } catch (error) {
                logger.error(`❌ RSS feed processing failed for ${feedId}:`, { error: error?.message || error });
                throw error;
            }
        });

        // Process all RSS feeds - ONLY 1 concurrent job to prevent overlaps
        this.rssQueue.process('process-all-feeds', 1, async (job) => {
            const { source, batchSize } = job.data;
            
            logger.info(`🔄 Processing all RSS feeds (batch size: ${batchSize})`);
            
            try {
                // Double-check no other RSS jobs are running
                const activeJobs = await this.rssQueue.getActive();
                const otherActiveRSSJobs = activeJobs.filter(activeJob => 
                    activeJob.id !== job.id && 
                    (activeJob.name === 'process-all-feeds' || activeJob.name === 'process-single-feed')
                );

                if (otherActiveRSSJobs.length > 0) {
                    logger.warn(`⚠️  Other RSS jobs already running (${otherActiveRSSJobs.length}), skipping this job`);
                    return { skipped: true, reason: 'Other RSS jobs already running' };
                }

                await job.progress(5);
                
                const result = await rssProcessor.processAllRSSFeeds();
                
                await job.progress(80);
                
                // Store job result in database
                await this.storeJobResult({
                    jobId: job.id,
                    jobType: 'all-feeds',
                    result,
                    source: source || 'scheduled'
                });
                
                await job.progress(90);
                
                // Trigger AI summary processing for new articles (if any were created)
                if (result.totalArticles > 0) {
                    try {
                        logger.info(`🤖 Triggering AI summary processing for ${result.totalArticles} new articles`);
                        // Import AI summary queue service dynamically to avoid circular dependencies
                        const { default: aiSummaryQueueService } = await import('./aiSummaryQueueService.js');
                        await aiSummaryQueueService.addImmediateJob({
                            batchSize: Math.min(result.totalArticles, 10),
                            maxRetries: 3,
                            forceRegenerate: false
                        });
                        logger.info('✅ AI summary job queued successfully');
                    } catch (aiError) {
                        logger.warn('⚠️ Failed to queue AI summary job:', { error: aiError.message });
                        // Don't fail the RSS job if AI queueing fails
                    }
                }
                
                await job.progress(100);
                
                return result;
            } catch (error) {
                logger.error(`❌ Batch RSS processing failed:`, { error: error?.message || error });
                throw error;
            }
        });

        // Store job results in database
        this.jobResultsQueue.process('store-result', async (job) => {
            const { jobData } = job.data;
            return await this.saveJobResultToDatabase(jobData);
        });
    }

    /**
     * Setup event listeners for job monitoring
     */
    setupEventListeners() {
        // RSS Queue Events
        this.rssQueue.on('completed', (job, result) => {
            logger.info(`✅ RSS job ${job.id} completed successfully`);
            
            // Handle different result structures
            if (result && typeof result === 'object') {
                if (result.totalArticles !== undefined) {
                    // Batch processing result with cleanup info
                    const cleanupInfo = result.duplicateCleanup ? 
                        `, ${result.duplicateCleanup.duplicatesRemoved} cleaned up` : '';
                    const finalCount = result.finalArticleCount ? 
                        `, final count: ${result.finalArticleCount}` : '';
                    
                    logger.info(`📊 Result: ${result.totalArticles} articles, ${result.totalDuplicates || 0} duplicates, ${result.totalErrors || 0} errors from ${result.processedFeeds} feeds${cleanupInfo}${finalCount}`);
                } else {
                    // Single feed processing result
                    logger.info(`📊 Result: ${result.processed || 0} articles, ${result.duplicates || 0} duplicates, ${result.errors || 0} errors`);
                }
            } else {
                logger.info(`📊 Result: Job completed with result: ${JSON.stringify(result)}`);
            }
        });

        this.rssQueue.on('failed', (job, err) => {
            logger.error(`❌ RSS job ${job.id} failed:`, { error: err.message?.message || err.message });
        });

        this.rssQueue.on('progress', (job, progress) => {
            logger.info(`🔄 Job ${job.id} progress: ${progress}%`);
        });

        this.rssQueue.on('stalled', (job) => {
            logger.warn(`⚠️  Job ${job.id} stalled`);
        });

        // Error handling
        this.rssQueue.on('error', (error) => {
            logger.error('❌ RSS Queue error:', { error: error?.message || error });
        });
    }

    /**
     * Add job to process a single RSS feed with overlap prevention
     * @param {string} feedId - RSS feed ID
     * @param {Object} options - Job options
     * @returns {Promise<Object>} Job object
     */
    async processSingleFeed(feedId, options = {}) {
        // Check for existing job for this specific feed
        const waitingJobs = await this.rssQueue.getWaiting();
        const activeJobs = await this.rssQueue.getActive();
        
        const hasSameFeedJob = [...waitingJobs, ...activeJobs].some(job => 
            job.name === 'process-single-feed' && job.data.feedId === feedId
        );

        if (hasSameFeedJob) {
            logger.warn(`⚠️  RSS feed ${feedId} already queued/processing, skipping duplicate`);
            return null;
        }

        const job = await this.rssQueue.add('process-single-feed', {
            feedId,
            source: options.source || 'manual',
            timestamp: new Date().toISOString()
        }, {
            priority: options.priority || 0,
            delay: options.delay || 0,
            attempts: options.attempts || RSS_PROCESSING_CONFIG.retryAttempts,
        });

        logger.info(`📋 Added RSS feed processing job: ${job.id} for feed ${feedId}`);
        return job;
    }

    /**
     * Add job to process all RSS feeds
     * @param {Object} options - Job options
     * @returns {Promise<Object>} Job object
     */
    async processAllFeeds(options = {}) {
        // Check for active and waiting RSS processing jobs to prevent overlaps
        const [activeJobs, waitingJobs] = await Promise.all([
            this.rssQueue.getActive(),
            this.rssQueue.getWaiting()
        ]);
        
        const hasActiveRSSJob = activeJobs.some(job => 
            job.name === 'process-all-feeds' || job.name === 'process-single-feed'
        );

        const hasWaitingRSSJob = waitingJobs.some(job => 
            job.name === 'process-all-feeds'
        );

        if (hasActiveRSSJob) {
            logger.warn(`⚠️  RSS processing job already active, skipping ${options.source || 'manual'} run`);
            return null;
        }

        if (hasWaitingRSSJob && options.source === 'scheduled') {
            logger.warn(`⚠️  RSS processing job already waiting, skipping scheduled run`);
            return null;
        }

        const job = await this.rssQueue.add('process-all-feeds', {
            source: options.source || 'manual',
            batchSize: options.batchSize || RSS_PROCESSING_CONFIG.batchSize,
            timestamp: new Date().toISOString()
        }, {
            priority: options.priority || 0,
            delay: options.delay || 0,
            attempts: options.attempts || RSS_PROCESSING_CONFIG.retryAttempts,
        });

        logger.info(`📋 Added batch RSS processing job: ${job.id}`);
        return job;
    }

    /**
     * Schedule periodic RSS processing
     */
    async setupScheduledProcessing() {
        // Remove existing scheduled jobs
        await this.rssQueue.removeRepeatable('process-all-feeds', {
            cron: RSS_PROCESSING_CONFIG.cronSchedule
        });

        // Add new scheduled job
        const job = await this.rssQueue.add('process-all-feeds', {
            source: 'scheduled',
            batchSize: RSS_PROCESSING_CONFIG.batchSize,
            timestamp: new Date().toISOString()
        }, {
            repeat: { 
                cron: RSS_PROCESSING_CONFIG.cronSchedule,
                tz: 'UTC'
            },
            removeOnComplete: 10,
            removeOnFail: 5,
        });

        logger.info(`⏰ Scheduled RSS processing every: ${RSS_PROCESSING_CONFIG.cronSchedule}`);
        logger.info(`✅ Scheduled RSS processing configured`);
        
        return job;
    }

    /**
     * Store job result metadata
     * @param {Object} jobData - Job result data
     */
    async storeJobResult(jobData) {
        try {
            // Add to job results queue for database storage
            await this.jobResultsQueue.add('store-result', {
                jobData: {
                    ...jobData,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            logger.error('Failed to queue job result storage:', { error: error?.message || error });
        }
    }

    /**
     * Save job result to database
     * @param {Object} jobData - Job result data
     */
    async saveJobResultToDatabase(jobData) {
        try {
            // You can create a JobHistory model later, for now just log
            logger.info(`💾 Storing job result: ${jobData.jobId}`);
            
            // TODO: Implement job history table
            // await prisma.jobHistory.create({
            //     data: {
            //         jobId: jobData.jobId,
            //         jobType: jobData.jobType,
            //         feedId: jobData.feedId,
            //         source: jobData.source,
            //         result: jobData.result,
            //         createdAt: new Date(jobData.timestamp)
            //     }
            // });

            return { success: true };
        } catch (error) {
            logger.error('Failed to save job result to database:', { error: error?.message || error });
            throw error;
        }
    }

    /**
     * Get queue statistics
     * @returns {Promise<Object>} Queue statistics
     */
    async getQueueStats() {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            this.rssQueue.getWaiting(),
            this.rssQueue.getActive(),
            this.rssQueue.getCompleted(),
            this.rssQueue.getFailed(),
            this.rssQueue.getDelayed(),
        ]);

        return {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
            delayed: delayed.length,
            total: waiting.length + active.length + completed.length + failed.length + delayed.length
        };
    }

    /**
     * Get recent jobs
     * @param {string} status - Job status (waiting, active, completed, failed)
     * @param {number} limit - Number of jobs to return
     * @returns {Promise<Array>} Recent jobs
     */
    async getRecentJobs(status = 'completed', limit = 10) {
        let jobs = [];
        
        switch (status) {
            case 'waiting':
                jobs = await this.rssQueue.getWaiting(0, limit - 1);
                break;
            case 'active':
                jobs = await this.rssQueue.getActive(0, limit - 1);
                break;
            case 'completed':
                jobs = await this.rssQueue.getCompleted(0, limit - 1);
                break;
            case 'failed':
                jobs = await this.rssQueue.getFailed(0, limit - 1);
                break;
            case 'delayed':
                jobs = await this.rssQueue.getDelayed(0, limit - 1);
                break;
        }

        return jobs.map(job => ({
            id: job.id,
            name: job.name,
            data: job.data,
            progress: job.progress(),
            timestamp: job.timestamp,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
            failedReason: job.failedReason,
            returnvalue: job.returnvalue
        }));
    }

    /**
     * Clean old jobs
     * @param {number} age - Age in milliseconds
     */
    async cleanOldJobs(age = 24 * 60 * 60 * 1000) { // 24 hours default
        try {
            await this.rssQueue.clean(age, 'completed');
            await this.rssQueue.clean(age, 'failed');
            logger.info(`🧹 Cleaned jobs older than ${age / (60 * 60 * 1000)} hours`);
        } catch (error) {
            logger.error('Failed to clean old jobs:', { error: error?.message || error });
        }
    }

    /**
     * Pause queue processing
     */
    async pauseQueue() {
        await this.rssQueue.pause();
        logger.info('⏸️  RSS queue paused');
    }

    /**
     * Resume queue processing
     */
    async resumeQueue() {
        await this.rssQueue.resume();
        logger.info('▶️  RSS queue resumed');
    }

    /**
     * Get queue health status
     */
    async getHealthStatus() {
        try {
            const stats = await this.getQueueStats();
            const isPaused = await this.rssQueue.isPaused();
            
            return {
                status: isPaused ? 'paused' : 'active',
                stats,
                redis: {
                    connected: this.rssQueue.client.status === 'ready'
                },
                lastProcessed: stats.completed > 0 ? new Date() : null
            };
        } catch (error) {
            return {
                status: 'error',
                error: error.message
            };
        }
    }

    /**
     * Initialize the RSS queue service
     */
    async initialize() {
        try {
            logger.info('🚀 Initializing RSS Queue Service...');
            
            // Test Redis connection
            await this.rssQueue.isReady();
            logger.info('✅ Redis connection established');
            
            // Clean old jobs on startup
            await this.cleanOldJobs();
            logger.info('✅ Old jobs cleaned');
            
            // Setup scheduled processing for future runs
            await this.setupScheduledProcessing();
            logger.info('✅ Scheduled RSS processing configured');
            
            // Run initial batch processing immediately on server startup
            logger.info('🚀 Starting initial RSS processing...');
            const initialJob = await this.processAllFeeds({
                source: 'startup',
                priority: 1
            });
            
            if (initialJob) {
                logger.info(`✅ Initial RSS processing job queued: ${initialJob.id}`);
            } else {
                logger.info(`ℹ️  Initial RSS processing skipped (other jobs already running)`);
            }
            
            logger.info('🎉 RSS Queue Service initialized successfully');
            
            return true;
        } catch (error) {
            logger.error('❌ Failed to initialize RSS Queue Service:', { error: error?.message || error });
            throw error;
        }
    }

    /**
     * Gracefully shutdown the queue service
     */
    async shutdown() {
        try {
            logger.info('🛑 Shutting down RSS Queue Service...');
            
            await this.rssQueue.close();
            await this.jobResultsQueue.close();
            
            logger.info('✅ RSS Queue Service shutdown complete');
        } catch (error) {
            logger.error('❌ Error during RSS Queue Service shutdown:', { error: error?.message || error });
        }
    }
}

export default new RSSQueueService();
