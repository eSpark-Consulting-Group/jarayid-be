import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import openaiService from './openaiService.js';
import webScraperService from './webScraperService.js';

// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] AI Summary: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
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

const prisma = new PrismaClient();

class AISummaryService {
    /**
     * Process articles that need AI summaries
     * @param {Object} options - Processing options
     * @returns {Promise<Object>} Processing results
     */
    async processArticleSummaries(options = {}) {
        const {
            batchSize = 5,
            maxRetries = 3,
            forceRegenerate = false
        } = options;

        try {
            logger.info('🤖 Starting AI summary processing for articles...');

            // Find articles that need summaries
            const articlesToProcess = await this.findArticlesNeedingSummaries(forceRegenerate);

            if (articlesToProcess.length === 0) {
                logger.info('✅ No articles need summary processing');
                return {
                    success: true,
                    processed: 0,
                    skipped: 0,
                    errors: 0,
                    message: 'No articles need summary processing'
                };
            }

            logger.info(`📝 Found ${articlesToProcess.length} articles needing summaries`);

            const results = {
                processed: 0,
                skipped: 0,
                errors: 0,
                results: []
            };

            // Process articles in batches
            for (let i = 0; i < articlesToProcess.length; i += batchSize) {
                const batch = articlesToProcess.slice(i, i + batchSize);
                
                logger.info(`🔄 Processing batch ${Math.floor(i / batchSize) + 1}: ${batch.length} articles`);

                for (const article of batch) {
                    try {
                        const result = await this.processArticleSummary(article, maxRetries);
                        
                        if (result.success) {
                            results.processed++;
                        } else {
                            results.errors++;
                        }

                        results.results.push({
                            articleId: article.id,
                            title: article.title.substring(0, 50) + '...',
                            ...result
                        });

                    } catch (error) {
                        results.errors++;
                        logger.error(`❌ Failed to process article ${article.id}:`, { error: error.message });
                        
                        results.results.push({
                            articleId: article.id,
                            title: article.title.substring(0, 50) + '...',
                            success: false,
                            error: error.message
                        });
                    }
                }

                // Small delay between batches to avoid overwhelming the AI service
                if (i + batchSize < articlesToProcess.length) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            logger.info(`✅ AI summary processing completed: ${results.processed} processed, ${results.errors} errors`);

            return {
                success: true,
                ...results,
                message: `Processed ${results.processed} articles, ${results.errors} errors`
            };

        } catch (error) {
            logger.error('❌ Error in AI summary processing:', { error: error.message });
            throw error;
        }
    }

    /**
     * Process summary for a single article
     * @param {Object} article - Article object
     * @param {number} maxRetries - Maximum retry attempts
     * @returns {Promise<Object>} Processing result
     */
    async processArticleSummary(article, maxRetries = 3) {
        let attempt = 0;
        let lastError = null;

        while (attempt < maxRetries) {
            try {
                attempt++;
                logger.info(`🎯 Processing article ${article.id}: "${article.title.substring(0, 40)}..." (attempt ${attempt})`);

                // Step 1: Get enhanced content from webpage if URL available
                let contentForAI = null;
                let scrapedContent = null;

                if (article.url && webScraperService.isScrapableUrl(article.url)) {
                    try {
                        logger.info(`🔍 Scraping content from: ${article.url}`);
                        const webContent = await webScraperService.getContentForAI(article.url);
                        contentForAI = webContent.content;
                        scrapedContent = webContent.originalData;
                        
                        logger.info(`✅ Scraped ${contentForAI.length} characters for AI processing`);
                    } catch (scrapeError) {
                        logger.warn(`⚠️ Failed to scrape ${article.url}:`, { 
                            error: scrapeError.message,
                            url: article.url,
                            articleId: article.id
                        });
                        
                        // Categorize the error type for better tracking
                        let errorType = 'unknown';
                        if (scrapeError.message.includes('403') || scrapeError.message.includes('Forbidden')) {
                            errorType = 'blocked';
                            logger.warn(`🚫 Anti-bot protection detected for ${article.url} - this is normal for some sites`);
                        } else if (scrapeError.message.includes('timeout')) {
                            errorType = 'timeout';
                            logger.warn(`⏰ Request timeout for ${article.url} - site may be slow`);
                        } else if (scrapeError.message.includes('404')) {
                            errorType = 'not_found';
                            logger.warn(`🔍 Article not found at ${article.url} - may have been moved or deleted`);
                        } else if (scrapeError.message.includes('500') || scrapeError.message.includes('502') || scrapeError.message.includes('503')) {
                            errorType = 'server_error';
                            logger.warn(`🔧 Server error for ${article.url} - site may have technical issues`);
                        }
                        
                        // Fallback to original RSS content (this is the correct behavior!)
                        contentForAI = this.getOriginalContentText(article);
                        logger.info(`📄 Using fallback RSS content (${contentForAI.length} characters) - error type: ${errorType}`);
                        
                        // Track scraping failures for analytics (optional)
                        this.trackScrapingFailure(article.url, errorType, scrapeError.message);
                    }
                } else {
                    logger.info(`📄 Using original RSS content for article ${article.id} (URL not scrapable or missing)`);
                    contentForAI = this.getOriginalContentText(article);
                }

                // Step 2: Generate AI summaries if we have content
                let summaryEnglish = null;
                let summaryArabic = null;

                if (contentForAI && openaiService.isAvailable()) {
                    logger.info(`🤖 Generating AI summaries for article ${article.id}`);
                    
                    const summaries = await openaiService.generateBilingualSummaries(
                        contentForAI, 
                        article.title
                    );

                    // Only accept if we got BOTH languages
                    if (summaries.english && summaries.arabic) {
                        summaryEnglish = summaries.english;
                        summaryArabic = summaries.arabic;
                        logger.info(`✅ Generated bilingual summaries: EN(${summaries.english.length} chars), AR(${summaries.arabic.length} chars)`);
                    } else {
                        logger.warn(`❌ Failed to generate both language summaries: EN=${!!summaries.english}, AR=${!!summaries.arabic}`);
                        // Don't update if we don't have both languages
                        return {
                            success: false,
                            articleId: article.id,
                            error: 'Failed to generate summaries in both languages',
                            attempt: attempt
                        };
                    }
                } else {
                    logger.warn(`⚠️ Cannot generate summaries: contentForAI=${!!contentForAI}, openaiAvailable=${openaiService.isAvailable()}`);
                    return {
                        success: false,
                        articleId: article.id,
                        error: 'No content available or OpenAI service not available',
                        attempt: attempt
                    };
                }

                // Step 3: Update article with enhanced content and summaries
                const updateData = {
                    summaryEnglish,
                    summaryArabic
                };

                // Update originalContent with scraped data if available
                if (scrapedContent) {
                    updateData.originalContent = {
                        ...article.originalContent,
                        scrapedContent: {
                            textContent: scrapedContent.textContent,
                            htmlContent: scrapedContent.htmlContent,
                            metadata: scrapedContent.metadata,
                            scrapedAt: scrapedContent.scrapedAt,
                            contentLength: scrapedContent.contentLength
                        }
                    };
                }

                const updatedArticle = await prisma.article.update({
                    where: { id: article.id },
                    data: updateData
                });

                logger.info(`✅ Successfully updated article ${article.id} with AI summaries`);

                return {
                    success: true,
                    articleId: article.id,
                    hasEnglishSummary: !!summaryEnglish,
                    hasArabicSummary: !!summaryArabic,
                    hasScrapedContent: !!scrapedContent,
                    attempt: attempt
                };

            } catch (error) {
                lastError = error;
                logger.warn(`⚠️ Attempt ${attempt} failed for article ${article.id}:`, { error: error.message });

                if (attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
                    logger.info(`⏳ Retrying in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        // All attempts failed
        logger.error(`❌ All ${maxRetries} attempts failed for article ${article.id}`);
        return {
            success: false,
            articleId: article.id,
            error: lastError?.message || 'Unknown error',
            attempts: maxRetries
        };
    }

    /**
     * Find articles that need AI summaries
     * @param {boolean} forceRegenerate - Force regenerate existing summaries
     * @returns {Promise<Array>} Articles needing summaries
     */
    async findArticlesNeedingSummaries(forceRegenerate = false) {
        let whereCondition;

        if (forceRegenerate) {
            // Process all articles
            whereCondition = {};
        } else {
            // Only process articles where BOTH summaries are missing
            whereCondition = {
                AND: [
                    {
                        OR: [
                            { summaryEnglish: null },
                            { summaryEnglish: '' }
                        ]
                    },
                    {
                        OR: [
                            { summaryArabic: null },
                            { summaryArabic: '' }
                        ]
                    }
                ]
            };
        }

        const articles = await prisma.article.findMany({
            where: whereCondition,
            select: {
                id: true,
                title: true,
                url: true,
                source: true,
                originalContent: true,
                summaryEnglish: true,
                summaryArabic: true,
                createdAt: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return articles;
    }

    /**
     * Extract text content from article's original content
     * @param {Object} article - Article object
     * @returns {string} Text content for AI processing
     */
    getOriginalContentText(article) {
        if (!article.originalContent) return article.title || '';

        const original = article.originalContent;
        
        // Try different content sources in order of preference
        const contentSources = [
            original.text,
            original.summary,
            original.html ? this.stripHTML(original.html) : null
        ];

        for (const content of contentSources) {
            if (content && content.trim().length > 50) {
                return content.trim();
            }
        }

        // Fallback to title
        return article.title || '';
    }

    /**
     * Strip HTML tags from content
     * @param {string} html - HTML content
     * @returns {string} Plain text
     */
    stripHTML(html) {
        if (!html) return '';
        
        return html
            .replace(/<[^>]*>/g, '')
            .replace(/&[^;]+;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Track scraping failures for analytics
     * @param {string} url - Failed URL
     * @param {string} errorType - Type of error
     * @param {string} errorMessage - Error message
     */
    trackScrapingFailure(url, errorType, errorMessage) {
        // This could be expanded to store in database for analytics
        logger.debug(`📊 Scraping failure tracked: ${url} - ${errorType}`, {
            url,
            errorType,
            errorMessage,
            domain: new URL(url).hostname,
            timestamp: new Date().toISOString()
        });
    }

    /**
     * Get statistics about articles needing summaries
     * @returns {Promise<Object>} Statistics
     */
    async getProcessingStats() {
        const [
            totalArticles,
            missingEnglish,
            missingArabic,
            missingBoth,
            withUrl,
            scrapableUrls
        ] = await Promise.all([
            prisma.article.count(),
            prisma.article.count({
                where: {
                    OR: [
                        { summaryEnglish: null },
                        { summaryEnglish: '' }
                    ]
                }
            }),
            prisma.article.count({
                where: {
                    OR: [
                        { summaryArabic: null },
                        { summaryArabic: '' }
                    ]
                }
            }),
            prisma.article.count({
                where: {
                    OR: [
                        {
                            AND: [
                                { summaryEnglish: null },
                                { summaryArabic: null }
                            ]
                        },
                        {
                            AND: [
                                { summaryEnglish: '' },
                                { summaryArabic: '' }
                            ]
                        }
                    ]
                }
            }),
            prisma.article.count({
                where: {
                    url: {
                        not: null
                    }
                }
            }),
            prisma.article.count({
                where: {
                    AND: [
                        { url: { not: null } },
                        { url: { not: '' } }
                    ]
                }
            })
        ]);

        return {
            totalArticles,
            missingEnglish,
            missingArabic,
            missingBoth,
            withUrl,
            scrapableUrls,
            needsProcessing: Math.max(missingEnglish, missingArabic),
            completionRate: totalArticles > 0 ? Math.round(((totalArticles - Math.max(missingEnglish, missingArabic)) / totalArticles) * 100) : 0
        };
    }

    /**
     * Get scraping success statistics by domain
     * @returns {Promise<Object>} Scraping statistics
     */
    async getScrapingStats() {
        try {
            // Get articles with scraped content vs those without
            const articlesWithUrls = await prisma.article.findMany({
                where: {
                    AND: [
                        { url: { not: null } },
                        { url: { not: '' } }
                    ]
                },
                select: {
                    url: true,
                    originalContent: true
                }
            });

            const domainStats = {};
            let totalWithUrls = 0;
            let successfulScrapes = 0;

            for (const article of articlesWithUrls) {
                totalWithUrls++;
                
                try {
                    const domain = new URL(article.url).hostname;
                    
                    if (!domainStats[domain]) {
                        domainStats[domain] = {
                            total: 0,
                            scraped: 0,
                            failed: 0
                        };
                    }
                    
                    domainStats[domain].total++;
                    
                    // Check if article has scraped content
                    const hasScrapedContent = article.originalContent?.scrapedContent?.textContent;
                    
                    if (hasScrapedContent) {
                        domainStats[domain].scraped++;
                        successfulScrapes++;
                    } else {
                        domainStats[domain].failed++;
                    }
                } catch (error) {
                    // Invalid URL, skip
                    continue;
                }
            }

            // Calculate success rates for each domain
            Object.keys(domainStats).forEach(domain => {
                const stats = domainStats[domain];
                stats.successRate = stats.total > 0 ? Math.round((stats.scraped / stats.total) * 100) : 0;
            });

            // Sort by total articles descending
            const sortedDomains = Object.entries(domainStats)
                .sort(([,a], [,b]) => b.total - a.total)
                .slice(0, 10); // Top 10 domains

            return {
                overall: {
                    totalWithUrls,
                    successfulScrapes,
                    failedScrapes: totalWithUrls - successfulScrapes,
                    overallSuccessRate: totalWithUrls > 0 ? Math.round((successfulScrapes / totalWithUrls) * 100) : 0
                },
                byDomain: Object.fromEntries(sortedDomains),
                topDomains: sortedDomains.map(([domain, stats]) => ({
                    domain,
                    ...stats
                }))
            };
        } catch (error) {
            logger.error('Error getting scraping stats:', error);
            return {
                overall: { error: error.message },
                byDomain: {},
                topDomains: []
            };
        }
    }
}

export default new AISummaryService();
