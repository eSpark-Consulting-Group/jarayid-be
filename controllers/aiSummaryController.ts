import { aiSummaryQueueService, aiSummaryService } from '../services/index.js';
import { response } from '../utils/index.js';
import winston from 'winston';

// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] AI Summary Controller: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
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

/**
 * AI Summary Controller
 * Handles API endpoints for AI summary generation and monitoring
 */
class AISummaryController {
    
    /**
     * Manually trigger AI summary processing
     * POST /api/ai-summary/process
     */
    async processArticleSummaries(req, res) {
        try {
            logger.info('🚀 Manual AI summary processing triggered via API');

            // Check if AI summary service is available
            if (!aiSummaryQueueService.isInitialized) {
                return response.error(res, 'AI Summary service is not initialized', 503, 'SERVICE_UNAVAILABLE');
            }

            // Get current processing statistics
            const stats = await aiSummaryService.getProcessingStats();
            
            if (stats.needsProcessing === 0) {
                return response.success(res, {
                    stats,
                    jobId: null
                }, 'No articles need AI summary processing');
            }

            // Queue the AI summary processing job
            const job = await aiSummaryQueueService.addImmediateJob({
                batchSize: req.body.batchSize || 5,
                maxRetries: req.body.maxRetries || 3,
                forceRegenerate: req.body.forceRegenerate || false,
                priority: 5 // Higher priority for manual requests
            });

            logger.info(`✅ AI summary job queued successfully: ${job.id}`);

            return response.success(res, {
                jobId: job.id,
                stats,
                estimatedDuration: `${Math.ceil(stats.needsProcessing / 5)} minutes`
            }, 'AI summary processing started', 202);

        } catch (error) {
            logger.error('❌ Error processing AI summaries:', { 
                error: error.message,
                stack: error.stack 
            });

            return response.error(res, 'Failed to start AI summary processing', 500, error.message);
        }
    }

    /**
     * Get AI summary processing statistics
     * GET /api/ai-summary/stats
     */
    async getProcessingStats(req, res) {
        try {
            logger.info('📊 AI summary statistics requested via API');

            const [stats, queueStats, scrapingStats] = await Promise.all([
                aiSummaryService.getProcessingStats(),
                aiSummaryQueueService.getQueueStats(),
                aiSummaryService.getScrapingStats()
            ]);

            return response.success(res, {
                articles: stats,
                queue: queueStats,
                scraping: scrapingStats,
                lastUpdated: new Date().toISOString()
            }, 'AI summary statistics retrieved');

        } catch (error) {
            logger.error('❌ Error getting AI summary stats:', { 
                error: error.message 
            });

            return response.error(res, 'Failed to retrieve AI summary statistics', 500, error.message);
        }
    }

    /**
     * Get specific job status
     * GET /api/ai-summary/job/:jobId
     */
    async getJobStatus(req, res) {
        try {
            const { jobId } = req.params;
            
            if (!jobId) {
                return response.error(res, 'Job ID is required', 400, 'MISSING_JOB_ID');
            }

            logger.info(`🔍 Job status requested for: ${jobId}`);

            const jobStatus = await aiSummaryQueueService.getJobStatus(jobId);

            if (!jobStatus) {
                return response.error(res, 'Job not found', 404, 'JOB_NOT_FOUND');
            }

            return response.success(res, jobStatus, 'Job status retrieved');

        } catch (error) {
            logger.error('❌ Error getting job status:', { 
                error: error.message,
                jobId: req.params.jobId 
            });

            return response.error(res, 'Failed to retrieve job status', 500, error.message);
        }
    }

    /**
     * Process summaries for specific articles
     * POST /api/ai-summary/articles
     * Body: { articleIds: [1, 2, 3] }
     */
    async processSpecificArticles(req, res) {
        try {
            const { articleIds } = req.body;

            if (!Array.isArray(articleIds) || articleIds.length === 0) {
                return response.error(res, 'Article IDs array is required', 400, 'INVALID_ARTICLE_IDS');
            }

            if (articleIds.length > 100) {
                return response.error(res, 'Maximum 100 articles can be processed at once', 400, 'TOO_MANY_ARTICLES');
            }

            logger.info(`🎯 Specific article processing requested for ${articleIds.length} articles`);

            // Queue specific article processing
            const job = await aiSummaryQueueService.addImmediateJob({
                batchSize: req.body.batchSize || 5,
                maxRetries: req.body.maxRetries || 3,
                forceRegenerate: true, // Force regenerate for specific requests
                priority: 8, // Highest priority for specific requests
                articleIds
            });

            logger.info(`✅ Specific article job queued: ${job.id}`);

            return response.success(res, {
                jobId: job.id,
                articleCount: articleIds.length,
                estimatedDuration: `${Math.ceil(articleIds.length / 5)} minutes`
            }, `AI summary processing started for ${articleIds.length} articles`, 202);

        } catch (error) {
            logger.error('❌ Error processing specific articles:', { 
                error: error.message,
                articleIds: req.body.articleIds 
            });

            return response.error(res, 'Failed to start specific article processing', 500, error.message);
        }
    }

    /**
     * Get recent AI summary jobs
     * GET /api/ai-summary/jobs
     */
    async getRecentJobs(req, res) {
        try {
            const { status = 'completed', limit = 10 } = req.query;

            logger.info(`📄 Recent jobs requested: status=${status}, limit=${limit}`);

            const jobs = await aiSummaryQueueService.getRecentJobs(status, parseInt(limit));

            return response.success(res, {
                jobs,
                count: jobs.length,
                status,
                limit: parseInt(limit)
            }, 'Recent jobs retrieved');

        } catch (error) {
            logger.error('❌ Error getting recent jobs:', { 
                error: error.message 
            });

            return response.error(res, 'Failed to retrieve recent jobs', 500, error.message);
        }
    }

    /**
     * Health check for AI summary service
     * GET /api/ai-summary/health
     */
    async healthCheck(req, res) {
        try {
            const isHealthy = aiSummaryQueueService.isInitialized;
            const stats = isHealthy ? await aiSummaryService.getProcessingStats() : null;

            return response.success(res, {
                status: isHealthy ? 'healthy' : 'unhealthy',
                initialized: aiSummaryQueueService.isInitialized,
                stats: stats,
                timestamp: new Date().toISOString()
            }, isHealthy ? 'AI Summary service is healthy' : 'AI Summary service is unavailable', isHealthy ? 200 : 503);

        } catch (error) {
            logger.error('❌ Error in health check:', { 
                error: error.message 
            });

            return response.error(res, 'AI Summary service health check failed', 503, error.message);
        }
    }
}

export default new AISummaryController();
