import fetch from 'node-fetch';
import prisma from '../prisma/index.js';

import winston from 'winston';
import cloudinaryService from './cloudinaryService.js';
import openaiService from './openaiService.js';

// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] RSS Processor: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
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



class RSSProcessor {
    /**
     * Process a single RSS feed and extract articles
     * @param {string} rssFeedId - RSS Feed ID from database
     * @returns {Promise<Object>} Processing result with statistics
     */
    async processRSSFeed(rssFeedId) {
        try {
            // Get RSS feed details from database
            const rssFeed = await prisma.rSSFeed.findUnique({
                where: { id: rssFeedId },
                include: {
                    category: true
                }
            });

            if (!rssFeed) {
                throw new Error(`RSS Feed with ID ${rssFeedId} not found`);
            }

            if (rssFeed.status !== 'PUBLISH') {
                logger.info(`RSS Feed ${rssFeed.name} is not published, skipping...`);
                return {
                    success: false,
                    message: 'RSS Feed is not published',
                    processed: 0,
                    duplicates: 0,
                    errors: 0
                };
            }

            logger.info(`Processing RSS Feed: ${rssFeed.name} (${rssFeed.url})`);

            // Fetch RSS feed data
            const feedData = await this.fetchRSSFeed(rssFeed.url);

            if (!feedData || !feedData.items || feedData.items.length === 0) {
                logger.warn(`No items found in RSS feed: ${rssFeed.name}`);
                return {
                    success: true,
                    message: 'No items found in RSS feed',
                    processed: 0,
                    duplicates: 0,
                    errors: 0
                };
            }

            // Process each article item
            const results = {
                processed: 0,
                duplicates: 0,
                errors: 0,
                articles: []
            };

            for (const item of feedData.items) {
                try {
                    const articleResult = await this.processRSSItem(item, rssFeed, feedData);

                    if (articleResult.success) {
                        if (articleResult.isDuplicate) {
                            results.duplicates++;
                        } else {
                            results.processed++;
                            results.articles.push(articleResult.article);
                        }
                    } else {
                        results.errors++;
                        logger.error(`Failed to process article: ${item.title}`, { error: articleResult.error });
                    }
                } catch (itemError) {
                    results.errors++;
                    logger.error(`Error processing RSS item: ${item.title || 'Unknown'}`, { error: itemError });
                }
            }

            logger.info(`RSS Feed processing completed: ${results.processed} processed, ${results.duplicates} duplicates, ${results.errors} errors`);

            return {
                success: true,
                message: `Processed RSS feed: ${rssFeed.name}`,
                ...results
            };

        } catch (error) {
            logger.error(`Error processing RSS feed ${rssFeedId}:`, { error: error.message, stack: error.stack });
            return {
                success: false,
                message: `Failed to process RSS feed: ${error.message}`,
                processed: 0,
                duplicates: 0,
                errors: 1
            };
        }
    }

    /**
     * Fetch RSS feed data from URL
     * @param {string} url - RSS feed URL
     * @returns {Promise<Object>} RSS feed data
     */
    async fetchRSSFeed(url) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Jarayid RSS Processor/1.0',
                    'Accept': 'application/json, application/rss+xml, application/xml, text/xml'
                },
                timeout: 15000
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('content-type');

            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            } else {
                // Handle XML RSS feeds (would need XML parser)
                throw new Error('XML RSS feeds not yet supported, please use JSON feed format');
            }
        } catch (error) {
            logger.error(`Failed to fetch RSS feed from ${url}:`, { error: error.message });
            throw error;
        }
    }

    /**
     * Process a single RSS item and create article
     * @param {Object} item - RSS item
     * @param {Object} rssFeed - RSS feed record
     * @param {Object} feedData - Complete feed data
     * @returns {Promise<Object>} Processing result
     */
    async processRSSItem(item, rssFeed, feedData) {
    try {
            // Enhanced duplicate detection - check multiple criteria
            const title = this.cleanText(item.title || 'Untitled Article');

            // Build comprehensive duplicate check conditions
            const duplicateConditions = [];

            // 1. Check by URL if available
            if (item.url) {
                duplicateConditions.push({ url: item.url });
            }

            // 2. Check by RSS ID if available
            if (item.id) {
                duplicateConditions.push({
                    originalContent: {
                        path: ['rss_id'],
                        equals: item.id
                    }
                });
            }

            // 3. Check by title + source combination (strong indicator)
            duplicateConditions.push({
                AND: [
                    { title: title },
                    { source: feedData.title || rssFeed.name || 'Unknown Source' }
                ]
            });

            // Check for existing article using any of the conditions
            const existingArticle = await prisma.article.findFirst({
                where: {
                    OR: duplicateConditions
                }
            });

            if (existingArticle) {
                return {
                    success: true,
                    isDuplicate: true,
                    message: `Article already exists (matched by ${item.url ? 'URL' : item.id ? 'RSS ID' : 'title+source'})`
                };
            }

            // Extract and prepare article data
            const articleData = await this.extractArticleData(item, rssFeed, feedData);

            // Log article data before creation for debugging
            logger.debug('Creating article with data:', {
                title: articleData.title.substring(0, 50) + '...',
                titleLength: articleData.title.length,
                urlLength: articleData.url ? articleData.url.length : 0,
                sourceLength: articleData.source.length,
                originalContentSize: JSON.stringify(articleData.originalContent).length
            });

            // Create article in database with enhanced error handling
            let article;
            try {
                article = await prisma.article.create({
                    data: articleData,
                    include: {
                        category: {
                            select: {
                                id: true,
                                name: true,
                                type: true
                            }
                        },
                        author: {
                            select: {
                                id: true,
                                name: true,
                                email: true
                            }
                        }
                    }
                });
            } catch (dbError) {
                logger.error('Database error creating article:', {
                    error: dbError.message,
                    title: articleData.title,
                    titleLength: articleData.title.length,
                    url: articleData.url,
                    urlLength: articleData.url ? articleData.url.length : 0,
                    sourceLength: articleData.source.length,
                    originalContentSize: JSON.stringify(articleData.originalContent).length
                });
                throw dbError;
            }

            return {
                success: true,
                isDuplicate: false,
                article: article,
                message: 'Article created successfully'
            };

        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: `Failed to process RSS item: ${error.message}`
            };
        }
    }

    /**
     * Extract and map RSS item data to article schema
     * @param {Object} item - RSS item
     * @param {Object} rssFeed - RSS feed record
     * @param {Object} feedData - Complete feed data
     * @returns {Promise<Object>} Article data for database
     */
    async extractArticleData(item, rssFeed, feedData) {
        // Extract basic article information
        const title = this.cleanText(item.title || 'Untitled Article');
        const url = item.url || null;
        const source = feedData.title || rssFeed.name || 'Unknown Source';

        // Log data lengths for debugging
        if (title.length > 450) {
            logger.warn(`Long title detected: ${title.length} chars`, { title: title.substring(0, 50) + '...' });
        }
        if (url && url.length > 450) {
            logger.warn(`Long URL detected: ${url.length} chars`, { url: url.substring(0, 100) + '...' });
        }
        if (source.length > 450) {
            logger.warn(`Long source detected: ${source.length} chars`, { source: source.substring(0, 50) + '...' });
        }

        // Extract content
        const originalContent = {
            text: this.cleanText(item.content_text || ''),
            html: item.content_html || '',
            summary: this.cleanText(item.summary || ''),
            authors: item.authors || [],
            tags: item.tags || [],
            rss_id: item.id || null,
            language: feedData.language || 'en'
        };

        // Check originalContent size (JSON serialized)
        const originalContentStr = JSON.stringify(originalContent);
        if (originalContentStr.length > 50000) { // 50KB limit for JSON content
            logger.warn(`Large originalContent detected: ${originalContentStr.length} chars`, { 
                title: title.substring(0, 50) + '...',
                textLength: originalContent.text.length,
                htmlLength: originalContent.html.length
            });
            
            // Truncate content if too large
            if (originalContent.text.length > 25000) {
                originalContent.text = originalContent.text.substring(0, 25000) + '... [truncated]';
            }
            if (originalContent.html.length > 25000) {
                originalContent.html = originalContent.html.substring(0, 25000) + '... [truncated]';
            }
        }

        // No summary generation during RSS processing - AI will handle this later
        let summaryEnglish = null;
        let summaryArabic = null;

        // Handle published date
        let publishedAt = new Date();
        if (item.date_published) {
            try {
                publishedAt = new Date(item.date_published);
                if (isNaN(publishedAt.getTime())) {
                    publishedAt = new Date();
                }
            } catch (dateError) {
                logger.warn(`Invalid date format: ${item.date_published}`);
                publishedAt = new Date();
            }
        }

        // Handle image upload to Cloudinary
        let image = null;
        let imageKey = null;

        if (item.image) {
            try {
                const imageResult = await this.processArticleImage(item.image, title);
                if (imageResult.success) {
                    image = imageResult.url;
                    imageKey = imageResult.key;
                } else {
                    // Fallback to original RSS image URL if Cloudinary processing fails
                    logger.warn(`Cloudinary upload failed for article: ${title}, using original RSS image`);
                    image = item.image;
                    imageKey = null; // No Cloudinary key since we're using original URL
                }
            } catch (imageError) {
                logger.warn(`Failed to process image for article: ${title}, using original RSS image`, { error: imageError.message });
                // Fallback to original RSS image URL
                image = item.image;
                imageKey = null;
            }
        }

        // Find a system user to assign as author (RSS articles need an author)
        const systemUser = await this.getSystemUser();

        return {
            title: this.truncateString(title, 500), // Ensure it fits varchar(500)
            url: url ? this.truncateString(url, 500) : null, // Ensure URL also fits varchar(500)
            source: this.truncateString(source, 500),
            originalContent,
            summaryEnglish,
            summaryArabic,
            image,
            imageKey,
            categoryId: rssFeed.categoryId,
            subType: rssFeed.subType, // Add subType from RSS feed
            rssFeedId: rssFeed.id, // Add RSS feed ID for direct relationship
            publishedAt,
            userId: systemUser.id,
            pinned: false,
            viewCount: 0
        };
    }

    /**
     * Process and upload article image to Cloudinary
     * @param {string} imageUrl - Image URL from RSS
     * @param {string} title - Article title for naming
     * @returns {Promise<Object>} Upload result
     */
    async processArticleImage(imageUrl, title) {
        try {
            // Fetch image from URL
            const response = await fetch(imageUrl, {
                timeout: 10000,
                headers: {
                    'User-Agent': 'Jarayid RSS Processor/1.0'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch image: HTTP ${response.status}`);
            }

            const buffer = await response.arrayBuffer();
            const contentType = response.headers.get('content-type');

            // Validate image type
            if (!contentType || !contentType.startsWith('image/')) {
                throw new Error('Invalid image content type');
            }

            // Generate filename
            const filename = `rss-${Date.now()}-${title.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 50)}.jpg`;

            // Upload to Cloudinary
            const uploadResult = await cloudinaryService.uploadImage(
                buffer,
                filename,
                'articles/rss'
            );

            return {
                success: true,
                url: uploadResult.url,
                key: uploadResult.key
            };

        } catch (error) {
            logger.error('Image processing error:', { error: error.message });
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate article summary from content
     * @param {string} content - Article content
     * @param {string} language - Target language
     * @returns {string} Generated summary
     */
    generateSummary(content, language = 'en') {
        if (!content) return null;

        // Simple summary generation (first 300 characters)
        // TODO: Implement AI-powered summarization
        const cleanContent = this.cleanText(content);

        if (cleanContent.length <= 300) {
            return cleanContent;
        }

        // Find the last complete sentence within 300 characters
        const truncated = cleanContent.substring(0, 300);
        const lastSentenceEnd = Math.max(
            truncated.lastIndexOf('.'),
            truncated.lastIndexOf('!'),
            truncated.lastIndexOf('?')
        );

        if (lastSentenceEnd > 100) {
            return truncated.substring(0, lastSentenceEnd + 1);
        }

        return truncated + '...';
    }

    /**
     * Clean and normalize text content
     * @param {string} text - Raw text
     * @returns {string} Cleaned text
     */
    cleanText(text) {
        if (!text) return '';

        return text
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&[^;]+;/g, ' ') // Remove HTML entities
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();
    }

    /**
     * Get or create a system user for RSS articles
     * @returns {Promise<Object>} System user
     */
    async getSystemUser() {
        let systemUser = await prisma.user.findFirst({
            where: {
                email: 'system@jarayid.com',
                role: 'ADMIN'
            }
        });

        if (!systemUser) {
            // Create system user if doesn't exist
            systemUser = await prisma.user.create({
                data: {
                    name:'System',
                    email: 'system@jarayid.com',
                    password: 'system-generated-password', // This won't be used for login
                    role: 'ADMIN',
                    isSocialLogin: false,
                    loginType: 'system'
                }
            });
        }

        return systemUser;
    }

    /**
     * Clean duplicate articles from the database
     * @returns {Promise<Object>} Cleanup results
     */
    async cleanDuplicateArticles() {
        try {
            logger.info('🧹 Starting post-processing duplicate cleanup...');

            let totalRemoved = 0;

            // Find duplicate articles by title + source combination
            const duplicatesByTitle = await prisma.article.groupBy({
                by: ['title', 'source'],
                _count: {
                    id: true,
                },
                having: {
                    id: {
                        _count: {
                            gt: 1,
                        },
                    },
                },
            });

            if (duplicatesByTitle.length > 0) {
                logger.info(`Found ${duplicatesByTitle.length} sets of title+source duplicates`);

                // Remove duplicates, keeping only the oldest (first) article
                for (const duplicate of duplicatesByTitle) {
                    const articlesWithSameTitleSource = await prisma.article.findMany({
                        where: {
                            title: duplicate.title,
                            source: duplicate.source,
                        },
                        orderBy: {
                            createdAt: 'asc', // Keep the oldest
                        },
                    });

                    // Keep the first one, delete the rest
                    const toDelete = articlesWithSameTitleSource.slice(1);
                    
                    if (toDelete.length > 0) {
                        logger.info(`Removing ${toDelete.length} duplicates of: "${duplicate.title.substring(0, 50)}..."`);
                        
                        const deleteResult = await prisma.article.deleteMany({
                            where: {
                                id: {
                                    in: toDelete.map(article => article.id),
                                },
                            },
                        });

                        totalRemoved += deleteResult.count;
                    }
                }
            }

            // Also check for URL duplicates
            const duplicatesByUrl = await prisma.article.groupBy({
                by: ['url'],
                _count: {
                    id: true,
                },
                where: {
                    url: {
                        not: null,
                    },
                },
                having: {
                    id: {
                        _count: {
                            gt: 1,
                        },
                    },
                },
            });

            if (duplicatesByUrl.length > 0) {
                logger.info(`Found ${duplicatesByUrl.length} sets of URL duplicates`);

                // Remove URL duplicates, keeping only the oldest
                for (const duplicate of duplicatesByUrl) {
                    const articlesWithSameUrl = await prisma.article.findMany({
                        where: {
                            url: duplicate.url,
                        },
                        orderBy: {
                            createdAt: 'asc', // Keep the oldest
                        },
                    });

                    // Keep the first one, delete the rest
                    const toDelete = articlesWithSameUrl.slice(1);
                    
                    if (toDelete.length > 0) {
                        logger.info(`Removing ${toDelete.length} URL duplicates of: ${duplicate.url}`);
                        
                        const deleteResult = await prisma.article.deleteMany({
                            where: {
                                id: {
                                    in: toDelete.map(article => article.id),
                                },
                            },
                        });

                        totalRemoved += deleteResult.count;
                    }
                }
            }

            const finalCount = await prisma.article.count();
            
            if (totalRemoved > 0) {
                logger.info(`✅ Duplicate cleanup completed: ${totalRemoved} articles removed, ${finalCount} articles remaining`);
            } else {
                logger.info(`✅ No duplicates found, ${finalCount} articles total`);
            }

            return {
                duplicatesRemoved: totalRemoved,
                remainingArticles: finalCount,
                titleSourceDuplicates: duplicatesByTitle.length,
                urlDuplicates: duplicatesByUrl.length
            };

        } catch (error) {
            logger.error('❌ Error during duplicate cleanup:', { error: error.message });
            return {
                duplicatesRemoved: 0,
                remainingArticles: 0,
                error: error.message
            };
        }
    }

    /**
     * Process all active RSS feeds
     * @returns {Promise<Object>} Overall processing results
     */
    async processAllRSSFeeds() {
        try {
            // Get all published RSS feeds
            const rssFeeds = await prisma.rSSFeed.findMany({
                where: { status: 'PUBLISH' },
                include: { category: true }
            });

            logger.info(`Found ${rssFeeds.length} active RSS feeds to process`);

            const overallResults = {
                totalFeeds: rssFeeds.length,
                processedFeeds: 0,
                failedFeeds: 0,
                totalArticles: 0,
                totalDuplicates: 0,
                totalErrors: 0,
                results: []
            };

            for (const rssFeed of rssFeeds) {
                try {
                    const result = await this.processRSSFeed(rssFeed.id);

                    if (result.success) {
                        overallResults.processedFeeds++;
                        overallResults.totalArticles += result.processed;
                        overallResults.totalDuplicates += result.duplicates;
                        overallResults.totalErrors += result.errors;
                    } else {
                        overallResults.failedFeeds++;
                    }

                    overallResults.results.push({
                        feedId: rssFeed.id,
                        feedName: rssFeed.name,
                        ...result
                    });

                } catch (feedError) {
                    overallResults.failedFeeds++;
                    overallResults.results.push({
                        feedId: rssFeed.id,
                        feedName: rssFeed.name,
                        success: false,
                        message: `Feed processing failed: ${feedError.message}`,
                        processed: 0,
                        duplicates: 0,
                        errors: 1
                    });
                    logger.error(`Failed to process RSS feed ${rssFeed.name}:`, { error: feedError.message });
                }
            }

            logger.info(`RSS processing completed: ${overallResults.processedFeeds}/${overallResults.totalFeeds} feeds processed, ${overallResults.totalArticles} articles created`);

            // Perform duplicate cleanup after processing all feeds
            const cleanupResults = await this.cleanDuplicateArticles();
            overallResults.duplicateCleanup = cleanupResults;

            // Update totals after cleanup
            if (cleanupResults.duplicatesRemoved > 0) {
                overallResults.totalDuplicates += cleanupResults.duplicatesRemoved;
                overallResults.finalArticleCount = cleanupResults.remainingArticles;
            }

            return overallResults;

        } catch (error) {
            logger.error('Error processing all RSS feeds:', { error: error.message, stack: error.stack });
            throw error;
        }
    }

    /**
     * Safely truncate string to maximum length
     * @param {string} str - String to truncate
     * @param {number} maxLength - Maximum allowed length
     * @returns {string} Truncated string
     */
    truncateString(str, maxLength) {
        if (!str) return str;
        if (str.length <= maxLength) return str;
        
        // Log when truncation occurs
        logger.warn(`Truncating string from ${str.length} to ${maxLength} chars: "${str.substring(0, 50)}..."`);
        
        return str.substring(0, maxLength);
    }
}

export default new RSSProcessor();
