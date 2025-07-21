import { openaiService } from '../services/index.js';

/**
 * Test OpenAI Article Summarization
 */
async function testOpenAISummarization() {
    console.log('🤖 Testing OpenAI Article Summarization\n');
    console.log('========================================\n');

    // Sample article content (real news article)
    const sampleContent = `
        Ecuador's most wanted gang leader, José Adolfo Macías, known as "Fito," has agreed to be extradited to the United States where he faces drug trafficking charges. The leader of Los Choneros gang had been on the run since escaping from a maximum-security prison in January 2024, triggering a national state of emergency. Fito's capture and subsequent agreement to extradition marks a significant victory in Ecuador's fight against organized crime. The 44-year-old gang leader is wanted by U.S. authorities on charges related to drug trafficking and weapons smuggling. His extradition is expected to provide valuable intelligence about international drug trafficking networks operating between South America and North America. Los Choneros is considered one of the most powerful criminal organizations in Ecuador, with connections to Mexican cartels and European drug markets.
    `;

    const sampleTitle = "Ecuador gang leader 'Fito' agrees to US extradition on drug charges";

    try {
        // Check if OpenAI service is available
        if (!openaiService.isAvailable()) {
            console.log('❌ OpenAI service is not available. To enable:');
            console.log('   1. Get an API key from https://platform.openai.com/api-keys');
            console.log('   2. Add OPENAI_API_KEY to your .env file');
            console.log('   3. Set OPENAI_ENABLED=true in your .env file');
            console.log('   4. Restart the application\n');
            
            console.log('🔄 Testing fallback summarization instead...');
            const fallbackSummary = openaiService.generateFallbackSummary(sampleContent, 200);
            console.log('📝 Fallback Summary (200 chars):');
            console.log(`"${fallbackSummary}"\n`);
            return;
        }

        console.log('✅ OpenAI service is available');
        console.log(`📰 Testing with article: "${sampleTitle}"\n`);

        // Test English summary
        console.log('🔄 Generating English summary...');
        const startTime = Date.now();
        
        const englishSummary = await openaiService.generateSummary(
            sampleContent, 
            sampleTitle, 
            'en'
        );

        const englishTime = Date.now() - startTime;

        if (englishSummary) {
            console.log(`✅ English Summary (${englishTime}ms):`);
            console.log(`"${englishSummary}"\n`);
        } else {
            console.log('❌ Failed to generate English summary\n');
        }

        // Test Arabic summary
        console.log('🔄 Generating Arabic summary...');
        const arabicStartTime = Date.now();
        
        const arabicSummary = await openaiService.generateSummary(
            sampleContent, 
            sampleTitle, 
            'ar'
        );

        const arabicTime = Date.now() - arabicStartTime;

        if (arabicSummary) {
            console.log(`✅ Arabic Summary (${arabicTime}ms):`);
            console.log(`"${arabicSummary}"\n`);
        } else {
            console.log('❌ Failed to generate Arabic summary\n');
        }

        // Test bilingual generation (parallel processing)
        console.log('🚀 Testing parallel bilingual summary generation...');
        const bilingualStartTime = Date.now();
        
        const bilingualSummaries = await openaiService.generateBilingualSummaries(
            sampleContent, 
            sampleTitle
        );

        const bilingualTime = Date.now() - bilingualStartTime;

        console.log(`⚡ Bilingual Results (${bilingualTime}ms total):`);
        console.log(`📊 English: ${bilingualSummaries.english ? '✅ Generated' : '❌ Failed'}`);
        console.log(`📊 Arabic: ${bilingualSummaries.arabic ? '✅ Generated' : '❌ Failed'}`);

        if (bilingualSummaries.english) {
            console.log(`\n🇺🇸 English: "${bilingualSummaries.english}"`);
        }
        if (bilingualSummaries.arabic) {
            console.log(`\n🇸🇦 Arabic: "${bilingualSummaries.arabic}"`);
        }

        // Performance comparison
        console.log('\n📈 Performance Analysis:');
        console.log(`   Individual calls: ${englishTime + arabicTime}ms`);
        console.log(`   Parallel calls: ${bilingualTime}ms`);
        console.log(`   Speed improvement: ${Math.round(((englishTime + arabicTime - bilingualTime) / (englishTime + arabicTime)) * 100)}%`);

        // Test fallback method
        console.log('\n🔄 Testing fallback summary method...');
        const fallbackSummary = openaiService.generateFallbackSummary(sampleContent, 150);
        console.log('📝 Fallback Summary:');
        console.log(`"${fallbackSummary}"`);

        console.log('\n🎉 OpenAI integration test completed successfully!');

    } catch (error) {
        console.error('❌ Error testing OpenAI summarization:', error);
        console.log('\n🔄 Testing fallback method...');
        const fallbackSummary = openaiService.generateFallbackSummary(sampleContent, 200);
        console.log('📝 Fallback Summary:');
        console.log(`"${fallbackSummary}"`);
    }
}

/**
 * Test with actual RSS content format
 */
async function testWithRSSFormat() {
    console.log('\n🔄 Testing with RSS-like content format...');
    
    // Simulate RSS item content
    const rssContent = {
        content_text: "A major breakthrough in renewable energy technology has been announced by researchers at MIT. The new solar panel design achieves 40% efficiency, significantly higher than current commercial panels which typically achieve 20-22% efficiency. This advancement could revolutionize the solar industry and accelerate the transition to clean energy.",
        content_html: "<p>A major breakthrough in renewable energy technology has been announced by researchers at <strong>MIT</strong>. The new solar panel design achieves <em>40% efficiency</em>, significantly higher than current commercial panels which typically achieve 20-22% efficiency.</p><p>This advancement could revolutionize the solar industry and accelerate the transition to clean energy.</p>",
        title: "MIT Researchers Achieve 40% Efficiency in New Solar Panel Design"
    };

    if (openaiService.isAvailable()) {
        const summaries = await openaiService.generateBilingualSummaries(
            rssContent.content_text, 
            rssContent.title
        );

        console.log('📊 RSS Format Test Results:');
        console.log(`✅ English: ${summaries.english || 'Failed'}`);
        console.log(`✅ Arabic: ${summaries.arabic || 'Failed'}`);
    } else {
        console.log('⚠️  OpenAI not available, using fallback...');
        const fallback = openaiService.generateFallbackSummary(rssContent.content_text, 150);
        console.log(`📝 Fallback: ${fallback}`);
    }
}

// Run the tests
console.log('🚀 Starting OpenAI Integration Tests...\n');

testOpenAISummarization()
    .then(() => testWithRSSFormat())
    .then(() => {
        console.log('\n✅ All tests completed!');
        console.log('\n📋 Next Steps:');
        console.log('1. Add your OpenAI API key to .env file');
        console.log('2. Set OPENAI_ENABLED=true in .env file');
        console.log('3. Restart your RSS processing service');
        console.log('4. Your articles will now get AI-powered summaries! 🎉');
    })
    .catch((error) => {
        console.error('❌ Test failed:', error);
    });

export { testOpenAISummarization, testWithRSSFormat };
