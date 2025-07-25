import { rssQueueService } from '../services/index.js';
import Redis from 'ioredis';
import { REDIS_CONFIG } from '../config/config.js';

/**
 * Force clear all RSS jobs and restart clean
 */
async function forceClearAllJobs() {
    try {
console.log('🚀 Force RSS Queue Cleanup Tool');
console.log('===============================\n');

        // Initialize the queue service
console.log('📋 Connecting to RSS Queue...');
        await rssQueueService.initialize();

        // Get current job status
console.log('📊 Current job status:');
        const stats = await rssQueueService.getQueueStats();
console.log(`   Waiting: ${stats.waiting}`);
console.log(`   Active: ${stats.active}`);
console.log(`   Failed: ${stats.failed}`);
console.log(`   Delayed: ${stats.delayed}`);
console.log(`   Completed: ${stats.completed}\n`);

        // Pause the queue first
console.log('⏸️  Pausing queue...');
        await rssQueueService.pauseQueue();

        // Get all jobs and obliterate them
console.log('🗑️  Removing all jobs...');
        
        // Clean all job types
        await rssQueueService.rssQueue.empty();
        await rssQueueService.rssQueue.clean(0, 'completed');
        await rssQueueService.rssQueue.clean(0, 'waiting');
        await rssQueueService.rssQueue.clean(0, 'active');
        await rssQueueService.rssQueue.clean(0, 'failed');
        await rssQueueService.rssQueue.clean(0, 'delayed');
        await rssQueueService.rssQueue.clean(0, 'paused');

        // Remove all repeatable jobs
console.log('🔄 Removing scheduled jobs...');
        const repeatableJobs = await rssQueueService.rssQueue.getRepeatableJobs();
console.log(`   Found ${repeatableJobs.length} repeatable jobs`);
        
        for (const job of repeatableJobs) {
            await rssQueueService.rssQueue.removeRepeatable(job.name, job.cron, job.tz);
console.log(`   ✅ Removed repeatable job: ${job.name} (${job.cron})`);
        }

        // Force clean Redis keys
console.log('🧹 Cleaning Redis keys...');
        const redis = new Redis({
            port: REDIS_CONFIG.port,
            host: REDIS_CONFIG.host,
            password: REDIS_CONFIG.password,
            enableReadyCheck: false,
            maxRetriesPerRequest: null,
        });

        const keys = await redis.keys('bull:RSS Processing:*');
        if (keys.length > 0) {
            await redis.del(...keys);
console.log(`   ✅ Deleted ${keys.length} Redis keys`);
        }

        await redis.disconnect();

        // Resume queue
console.log('▶️  Resuming queue...');
        await rssQueueService.resumeQueue();

        // Final status check
console.log('📊 Final job status:');
        const finalStats = await rssQueueService.getQueueStats();
console.log(`   Waiting: ${finalStats.waiting}`);
console.log(`   Active: ${finalStats.active}`);
console.log(`   Failed: ${finalStats.failed}`);
console.log(`   Delayed: ${finalStats.delayed}`);
console.log(`   Completed: ${finalStats.completed}`);

console.log('\n🎉 All jobs cleared successfully!');
console.log('📝 Queue is now completely clean and ready.');
console.log('🔄 Restart your server to reinitialize with clean state.');

    } catch (error) {
        console.error('❌ Force cleanup failed:', error);
    } finally {
console.log('\n🔌 Queue connection closed.');
        await rssQueueService.shutdown();
        process.exit(0);
    }
}

forceClearAllJobs();
