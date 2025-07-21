import Bull from 'bull';
import winston from 'winston';
import { REDIS_CONFIG, RSS_PROCESSING_CONFIG } from '../config/config.js';
import aiSummaryService from './aiSummaryService.js';

// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] AI Summary Queue: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
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

class AISummaryQueueService {
    constructor() {
        this.queue = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the AI summary queue
     */
    async initialize() {
        try {
            if (this.isInitialized) {
                logger.warn('AI Summary Queue already initialized');
                return;
            }

            // Create Bull queue for AI summary processing
            this.queue = new Bull('ai-summary-processing', {
                redis: {
                    host: REDIS_CONFIG.host,
                    port: REDIS_CONFIG.port,
                    password: REDIS_CONFIG.password || undefined
                },
                defaultJobOptions: {
                    removeOnComplete: 50,
                    removeOnFail: 20,
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 30000
                    }
                }
            });

            // Set up job processing
            this.queue.process('process-article-summaries', RSS_PROCESSING_CONFIG.concurrency, this.processAISummaryJob.bind(this));

            // Set up event listeners
            this.setupEventListeners();

            // Add recurring job for processing summaries
            await this.addRecurringJob();

            this.isInitialized = true;
            logger.info('✅ AI Summary Queue initialized successfully');

        } catch (error) {
            logger.error('❌ Failed to initialize AI Summary Queue:', { error: error.message });
            throw error;
        }
    }

    /**
     * Set up event listeners for the queue
     */
    setupEventListeners() {
        this.queue.on('completed', (job, result) => {
            logger.info(`✅ AI summary job ${job.id} completed successfully`, {
                jobId: job.id,
                processed: result.processed,
                errors: result.errors
            });
        });

        this.queue.on('failed', (job, err) => {
            logger.error(`❌ AI summary job ${job.id} failed:`, {
                jobId: job.id,
                error: err.message,
                attempts: job.attemptsMade
            });
        });

        this.queue.on('stalled', (job) => {
            logger.warn(`⚠️ AI summary job ${job.id} stalled`, { jobId: job.id });
        });

        this.queue.on('progress', (job, progress) => {
            logger.info(`🔄 AI summary job ${job.id} progress: ${progress}%`, { jobId: job.id });
        });
    }

    /**
     * Add recurring job for AI summary processing
     */
    async addRecurringJob() {
        try {
            // Process AI summaries every 30 minutes (after RSS processing)
            const cronSchedule = '*/30 * * * *'; // Every 30 minutes
            
            await this.queue.add(
                'process-article-summaries',
                {
                    type: 'scheduled',
                    batchSize: 10,
                    maxRetries: 3
                },
                {
                    repeat: { cron: cronSchedule },
                    jobId: 'ai-summary-recurring'
                }
            );

            logger.info(`🔄 AI summary recurring job scheduled with cron: ${cronSchedule}`);
        } catch (error) {
            logger.error('❌ Failed to add recurring AI summary job:', { error: error.message });
            throw error;
        }
    }

    /**
     * Process AI summary job
     * @param {Object} job - Bull job
     * @returns {Promise<Object>} Job result
     */
    async processAISummaryJob(job) {
        try {
            const { batchSize = 10, maxRetries = 3, forceRegenerate = false } = job.data;

            logger.info(`🤖 Starting AI summary job ${job.id}`, {
                jobId: job.id,
                batchSize,
                maxRetries,
                forceRegenerate
            });

            // Update job progress
            await job.progress(5);

            // Get processing statistics
            const stats = await aiSummaryService.getProcessingStats();
            logger.info('📊 AI Summary Processing Stats:', stats);

            await job.progress(10);

            // Process articles needing summaries
            const result = await aiSummaryService.processArticleSummaries({
                batchSize,
                maxRetries,
                forceRegenerate
            });

            await job.progress(90);

            // Store job result
            logger.info(`💾 Storing AI summary job result: ${job.id}`);

            await job.progress(100);

            logger.info(`✅ AI summary job ${job.id} completed successfully`, {
                jobId: job.id,
                processed: result.processed,
                errors: result.errors
            });

            return {
                jobId: job.id,
                ...result,
                stats
            };

        } catch (error) {
            logger.error(`❌ AI summary job ${job.id} failed:`, {
                jobId: job.id,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Add immediate AI summary job
     * @param {Object} options - Job options
     * @returns {Promise<Object>} Job details
     */
    async addImmediateJob(options = {}) {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            const {
                batchSize = 5,
                maxRetries = 3,
                forceRegenerate = false,
                priority = 0
            } = options;

            const job = await this.queue.add(
                'process-article-summaries',
                {
                    type: 'immediate',
                    batchSize,
                    maxRetries,
                    forceRegenerate,
                    timestamp: new Date().toISOString()
                },
                {
                    priority,
                    delay: 0
                }
            );

            logger.info(`🚀 Added immediate AI summary job ${job.id}`, {
                jobId: job.id,
                batchSize,
                maxRetries,
                forceRegenerate
            });

            return {
                jobId: job.id,
                type: 'immediate',
                options: { batchSize, maxRetries, forceRegenerate }
            };

        } catch (error) {
            logger.error('❌ Failed to add immediate AI summary job:', { error: error.message });
            throw error;
        }
    }

    /**
     * Get queue statistics
     * @returns {Promise<Object>} Queue stats
     */
    async getQueueStats() {
        try {
            if (!this.queue) {
                return { error: 'Queue not initialized' };
            }

            const [waiting, active, completed, failed, delayed] = await Promise.all([
                this.queue.getWaiting(),
                this.queue.getActive(),
                this.queue.getCompleted(),
                this.queue.getFailed(),
                this.queue.getDelayed()
            ]);

            return {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
                delayed: delayed.length,
                total: waiting.length + active.length + completed.length + failed.length + delayed.length
            };

        } catch (error) {
            logger.error('❌ Failed to get AI summary queue stats:', { error: error.message });
            return { error: error.message };
        }
    }

    /**
     * Clean old jobs from the queue
     * @returns {Promise<Object>} Cleanup result
     */
    async cleanQueue() {
        try {
            if (!this.queue) {
                throw new Error('Queue not initialized');
            }

            const cleaned = await this.queue.clean(24 * 60 * 60 * 1000, 'completed'); // Clean completed jobs older than 24 hours
            const cleanedFailed = await this.queue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // Clean failed jobs older than 7 days

            logger.info(`🧹 Cleaned AI summary queue: ${cleaned.length} completed, ${cleanedFailed.length} failed jobs`);

            return {
                completedCleaned: cleaned.length,
                failedCleaned: cleanedFailed.length,
                total: cleaned.length + cleanedFailed.length
            };

        } catch (error) {
            logger.error('❌ Failed to clean AI summary queue:', { error: error.message });
            throw error;
        }
    }

    /**
     * Pause the queue
     */
    async pauseQueue() {
        if (this.queue) {
            await this.queue.pause();
            logger.info('⏸️ AI summary queue paused');
        }
    }

    /**
     * Resume the queue
     */
    async resumeQueue() {
        if (this.queue) {
            await this.queue.resume();
            logger.info('▶️ AI summary queue resumed');
        }
    }

    /**
     * Gracefully shut down the queue
     */
    async shutdown() {
        if (this.queue) {
            await this.queue.close();
            logger.info('🔴 AI summary queue shut down');
        }
    }
}

export default new AISummaryQueueService();
