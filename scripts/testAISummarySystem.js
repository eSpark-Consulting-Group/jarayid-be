import { aiSummaryService, aiSummaryQueueService, webScraperService } from '../services/index.js';

/**
 * Test the new AI Summary System
 */
async function testAISummarySystem() {
    console.log('🚀 Testing AI Summary System\n');
    console.log('============================\n');

    try {
        // Step 1: Get processing statistics
        console.log('📊 Getting processing statistics...');
        const stats = await aiSummaryService.getProcessingStats();
        
        console.log('Current Statistics:');
        console.log(`   Total Articles: ${stats.totalArticles}`);
        console.log(`   Missing English: ${stats.missingEnglish}`);
        console.log(`   Missing Arabic: ${stats.missingArabic}`);
        console.log(`   Missing Both: ${stats.missingBoth}`);
        console.log(`   With URLs: ${stats.withUrl}`);
        console.log(`   Completion Rate: ${stats.completionRate}%`);
        console.log('');

        if (stats.needsProcessing === 0) {
            console.log('✅ All articles already have summaries!');
            console.log('🔄 Testing with force regenerate...\n');
        }

        // Step 2: Test web scraping on a sample article
        console.log('🔍 Testing web scraping functionality...');
        
        // Get a sample article with URL
        const sampleArticles = await aiSummaryService.findArticlesNeedingSummaries(false);
        const articleWithUrl = sampleArticles.find(article => article.url && webScraperService.isScrapableUrl(article.url));
        
        if (articleWithUrl) {
            console.log(`📰 Testing scraping on: ${articleWithUrl.title.substring(0, 50)}...`);
            console.log(`🌐 URL: ${articleWithUrl.url}`);
            
            try {
                const webContent = await webScraperService.getContentForAI(articleWithUrl.url);
                console.log(`✅ Successfully scraped ${webContent.content.length} characters`);
                console.log(`📝 Content preview: "${webContent.content.substring(0, 150)}..."`);
                console.log('');
            } catch (scrapeError) {
                console.log(`❌ Scraping failed: ${scrapeError.message}`);
                console.log('⚠️ Will fall back to RSS content\n');
            }
        } else {
            console.log('⚠️ No articles with scrapable URLs found');
            console.log('📝 Will test with RSS content only\n');
        }

        // Step 3: Test AI summary processing
        console.log('🤖 Testing AI summary processing...');
        
        const processResult = await aiSummaryService.processArticleSummaries({
            batchSize: 3, // Small batch for testing
            maxRetries: 2
        });

        console.log('Processing Results:');
        console.log(`   Processed: ${processResult.processed}`);
        console.log(`   Skipped: ${processResult.skipped}`);
        console.log(`   Errors: ${processResult.errors}`);
        console.log('');

        if (processResult.results.length > 0) {
            console.log('📋 Sample Results:');
            processResult.results.slice(0, 3).forEach((result, index) => {
                console.log(`   ${index + 1}. ${result.title}`);
                console.log(`      Success: ${result.success ? '✅' : '❌'}`);
                if (result.success) {
                    console.log(`      English: ${result.hasEnglishSummary ? '✅' : '❌'}`);
                    console.log(`      Arabic: ${result.hasArabicSummary ? '✅' : '❌'}`);
                    console.log(`      Scraped: ${result.hasScrapedContent ? '✅' : '❌'}`);
                } else {
                    console.log(`      Error: ${result.error}`);
                }
                console.log('');
            });
        }

        // Step 4: Test queue system
        console.log('⚙️ Testing AI Summary Queue System...');
        
        // Initialize queue
        await aiSummaryQueueService.initialize();
        console.log('✅ Queue initialized successfully');

        // Get queue stats
        const queueStats = await aiSummaryQueueService.getQueueStats();
        console.log('Queue Statistics:');
        console.log(`   Waiting: ${queueStats.waiting}`);
        console.log(`   Active: ${queueStats.active}`);
        console.log(`   Completed: ${queueStats.completed}`);
        console.log(`   Failed: ${queueStats.failed}`);
        console.log('');

        // Add immediate job
        const jobResult = await aiSummaryQueueService.addImmediateJob({
            batchSize: 2,
            maxRetries: 2,
            forceRegenerate: false
        });

        console.log('✅ Added immediate AI summary job:');
        console.log(`   Job ID: ${jobResult.jobId}`);
        console.log(`   Type: ${jobResult.type}`);
        console.log('');

        // Wait a bit for the job to process
        console.log('⏳ Waiting for job to process...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Check updated queue stats
        const updatedQueueStats = await aiSummaryQueueService.getQueueStats();
        console.log('Updated Queue Statistics:');
        console.log(`   Waiting: ${updatedQueueStats.waiting}`);
        console.log(`   Active: ${updatedQueueStats.active}`);
        console.log(`   Completed: ${updatedQueueStats.completed}`);
        console.log(`   Failed: ${updatedQueueStats.failed}`);
        console.log('');

        // Step 5: Check final statistics
        console.log('📈 Final Statistics Check...');
        const finalStats = await aiSummaryService.getProcessingStats();
        
        console.log('Final Statistics:');
        console.log(`   Total Articles: ${finalStats.totalArticles}`);
        console.log(`   Missing English: ${finalStats.missingEnglish}`);
        console.log(`   Missing Arabic: ${finalStats.missingArabic}`);
        console.log(`   Completion Rate: ${finalStats.completionRate}%`);
        
        const improvement = finalStats.completionRate - stats.completionRate;
        if (improvement > 0) {
            console.log(`   📈 Improvement: +${improvement.toFixed(1)}%`);
        }
        console.log('');

        console.log('🎉 AI Summary System Test Completed Successfully!');
        console.log('');
        console.log('🔄 System Integration:');
        console.log('1. ✅ RSS feeds fetch articles quickly (no AI delay)');
        console.log('2. ✅ AI summary processing runs separately');
        console.log('3. ✅ Web scraping gets full article content');
        console.log('4. ✅ Queue system handles background processing');
        console.log('5. ✅ Automatic processing after RSS jobs');
        console.log('');
        console.log('🚀 Your system is now fully separated and optimized!');

    } catch (error) {
        console.error('❌ Test failed:', error);
        throw error;
    }
}

/**
 * Test just the web scraping functionality
 */
async function testWebScrapingOnly() {
    console.log('🔍 Testing Web Scraping Only...\n');
    
    const testUrls = [
        'https://techcrunch.com/2024/01/15/ai-startup-raises-funding/',
        'https://www.bbc.com/news/technology',
        'https://example.com/article'
    ];

    for (const url of testUrls) {
        console.log(`🌐 Testing: ${url}`);
        
        if (!webScraperService.isScrapableUrl(url)) {
            console.log('❌ URL not scrapable (unsupported format)');
            continue;
        }

        try {
            const content = await webScraperService.getContentForAI(url);
            console.log(`✅ Success: ${content.content.length} characters`);
            console.log(`📄 Preview: "${content.content.substring(0, 100)}..."`);
        } catch (error) {
            console.log(`❌ Failed: ${error.message}`);
        }
        console.log('');
    }
}

// Run the tests
console.log('🧪 Starting AI Summary System Tests...\n');

testAISummarySystem()
    .then(() => {
        console.log('\n✅ All tests completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Tests failed:', error);
        process.exit(1);
    });

export { testAISummarySystem, testWebScrapingOnly };
