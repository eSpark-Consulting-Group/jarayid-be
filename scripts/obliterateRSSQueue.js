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

async function obliterateQueue() {
    try {
console.log('💥 OBLITERATING RSS Queue...');
console.log('⚠️  This will completely destroy all jobs and queue data!');
        
        // Use obliterate to completely destroy the queue
        await rssQueue.obliterate({ force: true });
        
console.log('🎉 Queue completely obliterated!');
console.log('📝 All jobs, schedules, and queue data have been removed.');
console.log('🚀 Ready for fresh start!');
        
    } catch (error) {
        console.error('❌ Error obliterating queue:', error.message);
    } finally {
        // Close the queue connection
        await rssQueue.close();
console.log('\n🔌 Queue connection closed.');
        process.exit(0);
    }
}

// Run the obliteration
console.log('💥 RSS Queue OBLITERATION Tool');
console.log('================================\n');
console.log('⚠️  WARNING: This will completely destroy the queue!');

obliterateQueue().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
});
