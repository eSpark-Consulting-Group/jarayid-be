import Queue from 'bull';
import Redis from 'ioredis';
import { REDIS_CONFIG } from '../config/config.js';

/**
 * Simple job cleaner without initializing the full service
 */
async function clearAllJobs() {
    try {
        // console.log('🧹 Simple RSS Job Cleaner');
        // console.log('==========================\n');

        // Create Redis connection
        const redisConfig = {
            port: REDIS_CONFIG.port,
            host: REDIS_CONFIG.host,
            password: REDIS_CONFIG.password,
            enableReadyCheck: false,
            maxRetriesPerRequest: null,
        };

        // Create RSS queue
        const rssQueue = new Queue('RSS Processing', { redis: redisConfig });

        // console.log('📊 Getting current job counts...');
        const stats = await rssQueue.getJobCounts();
        // console.log('Current jobs:', stats);

        // console.log('\n🗑️  Clearing all jobs...');
        
        // Empty the queue first (removes waiting and delayed jobs)
        await rssQueue.empty();
        
        // Clean specific job states with correct Bull API
        await rssQueue.clean(0, 'completed');
        await rssQueue.clean(0, 'failed');
        await rssQueue.clean(0, 'active');

        // Remove repeatable jobs
        // console.log('🔄 Removing scheduled jobs...');
        const repeatableJobs = await rssQueue.getRepeatableJobs();
        // console.log(`Found ${repeatableJobs.length} repeatable jobs`);
        
        for (const job of repeatableJobs) {
            await rssQueue.removeRepeatable(job.name, job.cron, job.tz);
            // console.log(`✅ Removed: ${job.name} (${job.cron})`);
        }

        // Force clean Redis keys
        // console.log('\n🧹 Cleaning Redis keys...');
        const redis = new Redis(redisConfig);
        const keys = await redis.keys('bull:RSS Processing:*');
        if (keys.length > 0) {
            await redis.del(...keys);
            // console.log(`✅ Deleted ${keys.length} Redis keys`);
        }
        await redis.disconnect();

        // Final check
        // console.log('\n📊 Final job counts:');
        const finalStats = await rssQueue.getJobCounts();
        // console.log('Final jobs:', finalStats);

        await rssQueue.close();

        // console.log('\n🎉 All jobs cleared!');
        // console.log('📝 Queue is clean. You can now restart your server.');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

clearAllJobs();
