import Queue from 'bull';
import { REDIS_CONFIG } from '../config/config.js';

// Redis connection for Bull - same config as rssQueueService
const redisConfig = {
    port: REDIS_CONFIG.port,
    host: REDIS_CONFIG.host,
    password: REDIS_CONFIG.password,
    enableReadyCheck: false,
    maxRetriesPerRequest: null,
    retryDelayOnFailover: 100,
    family: 4,
    keepAlive: true,
};

// Create RSS processing queue
const rssQueue = new Queue('RSS Processing', {
    redis: redisConfig
});

async function clearAllJobs() {
    try {
        // console.log('🧹 Starting job cleanup...');
        
        // Get counts before cleanup
        const waiting = await rssQueue.getWaiting();
        const active = await rssQueue.getActive();
        const completed = await rssQueue.getCompleted();
        const failed = await rssQueue.getFailed();
        const delayed = await rssQueue.getDelayed();
        
        // console.log('📊 Current job counts:');
        // console.log(`   Waiting: ${waiting.length}`);
        // console.log(`   Active: ${active.length}`);
        // console.log(`   Completed: ${completed.length}`);
        // console.log(`   Failed: ${failed.length}`);
        // console.log(`   Delayed: ${delayed.length}`);
        
        // Clean all job types
        // console.log('\n🗑️  Removing all jobs...');
        
        // Remove completed jobs
        if (completed.length > 0) {
            await rssQueue.clean(0, 'completed');
            // console.log(`   ✅ Removed ${completed.length} completed jobs`);
        }
        
        // Remove failed jobs
        if (failed.length > 0) {
            await rssQueue.clean(0, 'failed');
            // console.log(`   ❌ Removed ${failed.length} failed jobs`);
        }
        
        // Remove waiting jobs
        if (waiting.length > 0) {
            await rssQueue.clean(0, 'wait');
            // console.log(`   ⏳ Removed ${waiting.length} waiting jobs`);
        }
        
        // Remove delayed jobs
        if (delayed.length > 0) {
            await rssQueue.clean(0, 'delayed');
            // console.log(`   ⏱️  Removed ${delayed.length} delayed jobs`);
        }
        
        // Remove active jobs (be careful with this)
        if (active.length > 0) {
            await rssQueue.clean(0, 'active');
            // console.log(`   🔄 Removed ${active.length} active jobs`);
        }
        
        // Also remove any paused jobs
        try {
            await rssQueue.clean(0, 'paused');
            // console.log(`   ⏸️  Removed any paused jobs`);
        } catch (error) {
            // Paused might not exist, ignore error
        }
        
        // console.log('\n🎉 All jobs cleared successfully!');
        // console.log('📝 Queue is now clean and ready for fresh testing.');
        
        // Verify cleanup
        const finalCounts = {
            waiting: (await rssQueue.getWaiting()).length,
            active: (await rssQueue.getActive()).length,
            completed: (await rssQueue.getCompleted()).length,
            failed: (await rssQueue.getFailed()).length,
            delayed: (await rssQueue.getDelayed()).length
        };
        
        // console.log('\n📊 Final job counts:');
        // console.log(`   Waiting: ${finalCounts.waiting}`);
        // console.log(`   Active: ${finalCounts.active}`);
        // console.log(`   Completed: ${finalCounts.completed}`);
        // console.log(`   Failed: ${finalCounts.failed}`);
        // console.log(`   Delayed: ${finalCounts.delayed}`);
        
        const totalRemaining = Object.values(finalCounts).reduce((sum, count) => sum + count, 0);
        
        if (totalRemaining === 0) {
            // console.log('\n✅ Perfect! Queue is completely clean.');
        } else {
            // console.log(`\n⚠️  Warning: ${totalRemaining} jobs still remain.`);
        }
        
    } catch (error) {
        console.error('❌ Error clearing jobs:', error.message);
    } finally {
        // Close the queue connection
        await rssQueue.close();
        // console.log('\n🔌 Queue connection closed.');
        process.exit(0);
    }
}

// Run the cleanup
// console.log('🚀 RSS Queue Job Cleanup Tool');
// console.log('===============================\n');

clearAllJobs().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});
