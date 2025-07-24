#!/usr/bin/env node

import 'dotenv/config';
import { rssQueueService, aiSummaryQueueService } from '../services/index.js';
import winston from 'winston';

// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] Job Cleanup: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

/**
 * Delete all jobs from all queues
 */
async function deleteAllJobs() {
    try {
        logger.info('🗑️  Starting job cleanup process...');

        // Initialize services
        logger.info('📡 Initializing RSS Queue Service...');
        await rssQueueService.initialize();
        
        logger.info('🤖 Initializing AI Summary Queue Service...');
        await aiSummaryQueueService.initialize();

        // Clean RSS Queue
        logger.info('🧹 Cleaning RSS Queue...');
        const rssQueues = [
            rssQueueService.processingQueue,
            rssQueueService.duplicateCleanupQueue
        ];

        for (const queue of rssQueues) {
            if (queue) {
                try {
                    // Get job counts before cleanup
                    const waiting = await queue.getWaiting();
                    const active = await queue.getActive();
                    const completed = await queue.getCompleted();
                    const failed = await queue.getFailed();
                    const delayed = await queue.getDelayed();
                    const paused = await queue.getPaused();

                    logger.info(`📊 Queue "${queue.name}" stats before cleanup:`, {
                        waiting: waiting.length,
                        active: active.length,
                        completed: completed.length,
                        failed: failed.length,
                        delayed: delayed.length,
                        paused: paused.length
                    });

                    // Clean all job states
                    await queue.clean(0, 'completed');
                    await queue.clean(0, 'active');
                    await queue.clean(0, 'failed');
                    await queue.clean(0, 'waiting');
                    await queue.clean(0, 'delayed');
                    await queue.clean(0, 'paused');

                    // Empty the queue completely
                    await queue.empty();

                    logger.info(`✅ Cleaned queue: ${queue.name}`);
                } catch (error) {
                    logger.error(`❌ Error cleaning queue ${queue.name}:`, { error: error.message });
                }
            }
        }

        // Clean AI Summary Queue
        logger.info('🧹 Cleaning AI Summary Queue...');
        if (aiSummaryQueueService.processingQueue) {
            try {
                const aiQueue = aiSummaryQueueService.processingQueue;
                
                // Get job counts before cleanup
                const waiting = await aiQueue.getWaiting();
                const active = await aiQueue.getActive();
                const completed = await aiQueue.getCompleted();
                const failed = await aiQueue.getFailed();
                const delayed = await aiQueue.getDelayed();
                const paused = await aiQueue.getPaused();

                logger.info(`📊 AI Queue stats before cleanup:`, {
                    waiting: waiting.length,
                    active: active.length,
                    completed: completed.length,
                    failed: failed.length,
                    delayed: delayed.length,
                    paused: paused.length
                });

                // Clean all job states
                await aiQueue.clean(0, 'completed');
                await aiQueue.clean(0, 'active');
                await aiQueue.clean(0, 'failed');
                await aiQueue.clean(0, 'waiting');
                await aiQueue.clean(0, 'delayed');
                await aiQueue.clean(0, 'paused');

                // Empty the queue completely
                await aiQueue.empty();

                logger.info(`✅ Cleaned AI Summary queue`);
            } catch (error) {
                logger.error(`❌ Error cleaning AI Summary queue:`, { error: error.message });
            }
        }

        // Verify cleanup
        logger.info('🔍 Verifying cleanup...');
        
        // Check RSS queues
        for (const queue of rssQueues) {
            if (queue) {
                try {
                    const waiting = await queue.getWaiting();
                    const active = await queue.getActive();
                    const completed = await queue.getCompleted();
                    const failed = await queue.getFailed();
                    const delayed = await queue.getDelayed();
                    const paused = await queue.getPaused();

                    const totalJobs = waiting.length + active.length + completed.length + 
                                    failed.length + delayed.length + paused.length;

                    logger.info(`📊 Queue "${queue.name}" after cleanup: ${totalJobs} total jobs`);
                } catch (error) {
                    logger.error(`❌ Error verifying queue ${queue.name}:`, { error: error.message });
                }
            }
        }

        // Check AI queue
        if (aiSummaryQueueService.processingQueue) {
            try {
                const aiQueue = aiSummaryQueueService.processingQueue;
                const waiting = await aiQueue.getWaiting();
                const active = await aiQueue.getActive();
                const completed = await aiQueue.getCompleted();
                const failed = await aiQueue.getFailed();
                const delayed = await aiQueue.getDelayed();
                const paused = await aiQueue.getPaused();

                const totalJobs = waiting.length + active.length + completed.length + 
                                failed.length + delayed.length + paused.length;

                logger.info(`📊 AI Queue after cleanup: ${totalJobs} total jobs`);
            } catch (error) {
                logger.error(`❌ Error verifying AI queue:`, { error: error.message });
            }
        }

        logger.info('🎉 Job cleanup completed successfully!');

    } catch (error) {
        logger.error('💥 Fatal error during job cleanup:', { error: error.message });
        throw error;
    } finally {
        // Shutdown services
        try {
            logger.info('🔌 Shutting down services...');
            await rssQueueService.shutdown();
            await aiSummaryQueueService.shutdown();
            logger.info('✅ Services shutdown complete');
        } catch (shutdownError) {
            logger.error('❌ Error during shutdown:', { error: shutdownError.message });
        }
    }
}

/**
 * Delete specific types of jobs
 * @param {string} jobType - Type of jobs to delete ('rss', 'ai', or 'all')
 */
async function deleteJobsByType(jobType = 'all') {
    logger.info(`🎯 Deleting ${jobType} jobs...`);

    try {
        // Initialize services
        await rssQueueService.initialize();
        await aiSummaryQueueService.initialize();

        if (jobType === 'rss' || jobType === 'all') {
            logger.info('🗑️  Deleting RSS jobs...');
            
            if (rssQueueService.processingQueue) {
                await rssQueueService.processingQueue.empty();
                await rssQueueService.processingQueue.clean(0, 'completed');
                await rssQueueService.processingQueue.clean(0, 'failed');
                logger.info('✅ RSS processing queue cleaned');
            }
            
            if (rssQueueService.duplicateCleanupQueue) {
                await rssQueueService.duplicateCleanupQueue.empty();
                await rssQueueService.duplicateCleanupQueue.clean(0, 'completed');
                await rssQueueService.duplicateCleanupQueue.clean(0, 'failed');
                logger.info('✅ RSS cleanup queue cleaned');
            }
        }

        if (jobType === 'ai' || jobType === 'all') {
            logger.info('🗑️  Deleting AI jobs...');
            
            if (aiSummaryQueueService.processingQueue) {
                await aiSummaryQueueService.processingQueue.empty();
                await aiSummaryQueueService.processingQueue.clean(0, 'completed');
                await aiSummaryQueueService.processingQueue.clean(0, 'failed');
                logger.info('✅ AI summary queue cleaned');
            }
        }

        logger.info(`🎉 ${jobType} jobs deleted successfully!`);

    } catch (error) {
        logger.error(`💥 Error deleting ${jobType} jobs:`, { error: error.message });
        throw error;
    } finally {
        await rssQueueService.shutdown();
        await aiSummaryQueueService.shutdown();
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    const command = args[0] || 'all';

    try {
        switch (command) {
            case 'all':
                await deleteAllJobs();
                break;
            case 'rss':
                await deleteJobsByType('rss');
                break;
            case 'ai':
                await deleteJobsByType('ai');
                break;
            case 'help':
                // console.log(`
Usage: node deleteAllJobs.js [command]

Commands:
  all     Delete all jobs from all queues (default)
  rss     Delete only RSS processing jobs
  ai      Delete only AI summary jobs  
  help    Show this help message

Examples:
  node deleteAllJobs.js
  node deleteAllJobs.js all
  node deleteAllJobs.js rss
  node deleteAllJobs.js ai
                `);
                break;
            default:
                logger.error(`❌ Unknown command: ${command}. Use 'help' for usage information.`);
                process.exit(1);
        }
        
        logger.info('✨ Script completed successfully');
        process.exit(0);
        
    } catch (error) {
        logger.error('💥 Script failed:', { error: error.message });
        process.exit(1);
    }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('🚨 Uncaught Exception:', error);
    process.exit(1);
});

// Run the script
main();
