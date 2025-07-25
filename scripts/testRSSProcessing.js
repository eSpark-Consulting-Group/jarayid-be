import rssProcessor from '../services/rssProcessor.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Test script for RSS processing functionality
 * This demonstrates how to use the RSS processor
 */
async function testRSSProcessing() {
    try {
        // console.log('🚀 Starting RSS Processing Test...\n');

        // Get a sample RSS feed from your database
        const sampleRSSFeed = await prisma.rSSFeed.findFirst({
            where: { status: 'PUBLISH' },
            include: { category: true }
        });

        if (!sampleRSSFeed) {
            // console.log('⚠️  No published RSS feeds found in database.');
            // console.log('   Please create and publish an RSS feed first.');
            return;
        }

        // console.log(`📡 Testing with RSS Feed: ${sampleRSSFeed.name}`);
        // console.log(`🔗 URL: ${sampleRSSFeed.url}`);
        // console.log(`📂 Category: ${sampleRSSFeed.category.name}\n`);

        // Process single RSS feed
        // console.log('🔄 Processing single RSS feed...');
        const result = await rssProcessor.processRSSFeed(sampleRSSFeed.id);

        if (result.success) {
            // console.log('✅ RSS Feed processed successfully!');
            // console.log(`📰 Articles created: ${result.processed}`);
            // console.log(`🔄 Duplicates skipped: ${result.duplicates}`);
            // console.log(`❌ Errors: ${result.errors}`);
        } else {
            // console.log('❌ RSS Feed processing failed:', result.message);
        }

        // console.log('\n' + '='.repeat(50) + '\n');

        // Test processing all RSS feeds
        // console.log('🔄 Testing batch processing of all RSS feeds...');
        const batchResult = await rssProcessor.processAllRSSFeeds();

        // console.log('✅ Batch processing completed!');
        // console.log(`📊 Total feeds: ${batchResult.totalFeeds}`);
        // console.log(`✅ Processed feeds: ${batchResult.processedFeeds}`);
        // console.log(`❌ Failed feeds: ${batchResult.failedFeeds}`);
        // console.log(`📰 Total articles created: ${batchResult.totalArticles}`);
        // console.log(`🔄 Total duplicates: ${batchResult.totalDuplicates}`);
        // console.log(`❌ Total errors: ${batchResult.totalErrors}`);

        // Show detailed results
        // console.log('\n📋 Detailed Results:');
        batchResult.results.forEach((feedResult, index) => {
            // console.log(`${index + 1}. ${feedResult.feedName}: ${feedResult.success ? '✅' : '❌'} ${feedResult.message}`);
            if (feedResult.success) {
                // console.log(`   📰 ${feedResult.processed} articles, 🔄 ${feedResult.duplicates} duplicates`);
            }
        });

    } catch (error) {
        console.error('❌ Test failed:', error);
    } finally {
        await prisma.$disconnect();
    }
}

/**
 * Manual test of RSS feed URL fetching
 */
async function testRSSFeedFetch() {
    try {
        // console.log('🌐 Testing RSS feed fetching...\n');

        // Test with the provided CNN example
        const testUrl = 'https://rss.app/feeds/v1.1/tezuymEh1lxMWxg5.json';
        
        // console.log(`📡 Fetching: ${testUrl}`);
        const feedData = await rssProcessor.fetchRSSFeed(testUrl);

        // console.log('✅ Feed fetched successfully!');
        // console.log(`📰 Feed title: ${feedData.title}`);
        // console.log(`🌍 Language: ${feedData.language}`);
        // console.log(`📝 Description: ${feedData.description?.substring(0, 100)}...`);
        // console.log(`📰 Number of items: ${feedData.items?.length || 0}`);

        if (feedData.items && feedData.items.length > 0) {
            // console.log('\n📄 Sample article:');
            const sample = feedData.items[0];
            // console.log(`   Title: ${sample.title}`);
            // console.log(`   URL: ${sample.url}`);
            // console.log(`   Published: ${sample.date_published}`);
            // console.log(`   Authors: ${sample.authors?.map(a => a.name).join(', ') || 'Unknown'}`);
            // console.log(`   Content preview: ${sample.content_text?.substring(0, 150)}...`);
        }

    } catch (error) {
        console.error('❌ Feed fetch test failed:', error);
    }
}

// Run tests
if (process.argv.includes('--fetch-test')) {
    testRSSFeedFetch();
} else {
    testRSSProcessing();
}

export { testRSSProcessing, testRSSFeedFetch };
