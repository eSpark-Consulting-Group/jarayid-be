import { rssQueueService } from '../services/index.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Test script for RSS Queue system
 */
async function testRSSQueue() {
    try {
console.log('🚀 Starting RSS Queue Test...\n');

        // Initialize the queue service
console.log('📋 Initializing RSS Queue Service...');
        await rssQueueService.initialize();
console.log('✅ RSS Queue Service initialized\n');

        // Get queue status
console.log('📊 Getting queue status...');
        const status = await rssQueueService.getHealthStatus();
console.log('Queue Status:', JSON.stringify(status, null, 2));
console.log('');

        // Get queue statistics
console.log('📈 Getting queue statistics...');
        const stats = await rssQueueService.getQueueStats();
console.log('Queue Stats:', JSON.stringify(stats, null, 2));
console.log('');

        // Get a sample RSS feed from database
        const sampleRSSFeed = await prisma.rSSFeed.findFirst({
            where: { status: 'PUBLISH' },
            include: { category: true }
        });

        if (sampleRSSFeed) {
console.log(`📡 Found sample RSS feed: ${sampleRSSFeed.name}`);
            
            // Queue single feed processing
console.log('📋 Queueing single RSS feed for processing...');
            const singleJob = await rssQueueService.processSingleFeed(sampleRSSFeed.id, {
                source: 'test',
                priority: 1
            });
console.log(`✅ Single feed job queued: ${singleJob.id}\n`);

            // Wait a moment for job to start
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Check job status
console.log('🔍 Checking job status...');
            const job = await rssQueueService.rssQueue.getJob(singleJob.id);
            if (job) {
                const jobState = await job.getState();
console.log(`Job ${singleJob.id} status: ${jobState}`);
console.log(`Job progress: ${job.progress()}%`);
            }
        } else {
console.log('⚠️  No published RSS feeds found for testing');
        }

        // Queue batch processing
console.log('\n📋 Queueing batch RSS processing...');
        const batchJob = await rssQueueService.processAllFeeds({
            source: 'test',
            priority: 2
        });
console.log(`✅ Batch processing job queued: ${batchJob.id}\n`);

        // Get recent jobs
console.log('📄 Getting recent completed jobs...');
        const recentJobs = await rssQueueService.getRecentJobs('completed', 3);
console.log(`Found ${recentJobs.length} recent completed jobs:`);
        recentJobs.forEach((job, index) => {
console.log(`${index + 1}. Job ${job.id}: ${job.name} - ${new Date(job.finishedOn).toLocaleString()}`);
        });

        // Wait for jobs to complete (optional)
console.log('\n⏳ Waiting 10 seconds for jobs to process...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Final queue stats
console.log('📊 Final queue statistics:');
        const finalStats = await rssQueueService.getQueueStats();
console.log(JSON.stringify(finalStats, null, 2));

    } catch (error) {
        console.error('❌ RSS Queue test failed:', error);
    } finally {
        await prisma.$disconnect();
console.log('\n🛑 Test completed');
    }
}

/**
 * Test scheduled processing setup
 */
async function testScheduledProcessing() {
    try {
console.log('⏰ Testing scheduled processing setup...\n');

        await rssQueueService.initialize();
        
console.log('✅ Scheduled processing is now active');
console.log('🔄 RSS feeds will be processed automatically every 6 hours');
console.log('📅 Next scheduled run will appear in the queue as "waiting" status');
        
        // Get waiting jobs to see scheduled job
        const waitingJobs = await rssQueueService.getRecentJobs('waiting', 5);
console.log(`\n📋 Waiting jobs (including scheduled): ${waitingJobs.length}`);
        waitingJobs.forEach((job, index) => {
console.log(`${index + 1}. ${job.name} - ${job.data.source} - ${new Date(job.timestamp).toLocaleString()}`);
        });

    } catch (error) {
        console.error('❌ Scheduled processing test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * Test queue management operations
 */
async function testQueueManagement() {
    try {
console.log('🛠️  Testing queue management operations...\n');

        await rssQueueService.initialize();
        
        // Test pause/resume
console.log('⏸️  Pausing queue...');
        await rssQueueService.pauseQueue();
        
        let status = await rssQueueService.getHealthStatus();
console.log(`Queue status after pause: ${status.status}`);
        
console.log('▶️  Resuming queue...');
        await rssQueueService.resumeQueue();
        
        status = await rssQueueService.getHealthStatus();
console.log(`Queue status after resume: ${status.status}`);
        
        // Test cleanup
console.log('🧹 Cleaning old jobs...');
        await rssQueueService.cleanOldJobs(1000); // Clean jobs older than 1 second (for testing)
        
console.log('✅ Queue management test completed');

    } catch (error) {
        console.error('❌ Queue management test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Run tests based on command line arguments
const testType = process.argv[2];

switch (testType) {
    case '--scheduled':
        testScheduledProcessing();
        break;
    case '--management':
        testQueueManagement();
        break;
    default:
        testRSSQueue();
        break;
}

export { testRSSQueue, testScheduledProcessing, testQueueManagement };
