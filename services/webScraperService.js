import https from 'https';
import http from 'http';
import { JSDOM } from 'jsdom';
import winston from 'winston';

// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] Web Scraper: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
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

class WebScraperService {
    /**
     * Get random user agent to avoid detection
     * @returns {string} Random user agent string
     */
    getRandomUserAgent() {
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
            'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ];
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }

    /**
     * Add random delay to avoid rate limiting
     * @param {number} min - Minimum delay in ms
     * @param {number} max - Maximum delay in ms
     */
    async randomDelay(min = 1000, max = 3000) {
        const delay = Math.floor(Math.random() * (max - min + 1)) + min;
        await new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Fetch HTML content from URL with enhanced anti-detection
     * @param {string} url - The URL to fetch
     * @param {number} retryCount - Current retry attempt
     * @returns {Promise<string>} HTML content
     */
    async fetchHTML(url, retryCount = 0) {
        const maxRetries = 3;
        
        return new Promise(async (resolve, reject) => {
            try {
                // Add delay between requests to avoid rate limiting
                if (retryCount > 0) {
                    await this.randomDelay(2000, 5000);
                }

                const client = url.startsWith('https://') ? https : http;
                const parsedUrl = new URL(url);
                
                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port,
                    path: parsedUrl.pathname + parsedUrl.search,
                    method: 'GET',
                    headers: {
                        'User-Agent': this.getRandomUserAgent(),
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'DNT': '1',
                        'Connection': 'keep-alive',
                        'Upgrade-Insecure-Requests': '1',
                        'Sec-Fetch-Dest': 'document',
                        'Sec-Fetch-Mode': 'navigate',
                        'Sec-Fetch-Site': 'none',
                        'Sec-Fetch-User': '?1',
                        'Cache-Control': 'max-age=0',
                        'Referer': `https://${parsedUrl.hostname}/`
                    },
                    timeout: 30000
                };

                const req = client.request(options, (res) => {
                    // Handle redirects
                    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        logger.info(`Following redirect from ${url} to ${res.headers.location}`);
                        return this.fetchHTML(res.headers.location, retryCount).then(resolve).catch(reject);
                    }

                    // Handle different status codes
                    if (res.statusCode === 403) {
                        const error = new Error(`HTTP ${res.statusCode}: Forbidden - Anti-bot protection detected`);
                        if (retryCount < maxRetries) {
                            logger.warn(`🔄 Retrying request ${retryCount + 1}/${maxRetries} for ${url}`);
                            return this.fetchHTML(url, retryCount + 1).then(resolve).catch(reject);
                        }
                        reject(error);
                        return;
                    }

                    if (res.statusCode !== 200) {
                        const error = new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`);
                        if (retryCount < maxRetries && [429, 502, 503, 504].includes(res.statusCode)) {
                            logger.warn(`🔄 Retrying request ${retryCount + 1}/${maxRetries} for ${url} (Status: ${res.statusCode})`);
                            return this.fetchHTML(url, retryCount + 1).then(resolve).catch(reject);
                        }
                        reject(error);
                        return;
                    }

                    let data = '';
                    res.setEncoding('utf8');
                    res.on('data', chunk => {
                        data += chunk;
                    });

                    res.on('end', () => {
                        resolve(data);
                    });
                });

                req.on('error', (err) => {
                    if (retryCount < maxRetries) {
                        logger.warn(`🔄 Retrying request ${retryCount + 1}/${maxRetries} for ${url} (Error: ${err.message})`);
                        return this.fetchHTML(url, retryCount + 1).then(resolve).catch(reject);
                    }
                    reject(err);
                });

                req.on('timeout', () => {
                    req.destroy();
                    const error = new Error('Request timeout');
                    if (retryCount < maxRetries) {
                        logger.warn(`🔄 Retrying request ${retryCount + 1}/${maxRetries} for ${url} (Timeout)`);
                        return this.fetchHTML(url, retryCount + 1).then(resolve).catch(reject);
                    }
                    reject(error);
                });

                req.setTimeout(30000);
                req.end();

            } catch (error) {
                if (retryCount < maxRetries) {
                    logger.warn(`🔄 Retrying request ${retryCount + 1}/${maxRetries} for ${url} (Error: ${error.message})`);
                    return this.fetchHTML(url, retryCount + 1).then(resolve).catch(reject);
                }
                reject(error);
            }
        });
    }

    /**
     * Get clean webpage content for AI processing
     * @param {string} url - Article URL
     * @returns {Promise<Object>} Clean content and metadata
     */
    async getWebpageContent(url) {
        try {
            logger.info(`🔍 Scraping content from: ${url}`);

            // Fetch the HTML
            const html = await this.fetchHTML(url);

            // Parse with JSDOM
            const dom = new JSDOM(html);
            const doc = dom.window.document;

            // Extract basic metadata
            const metadata = {
                title: doc.querySelector('title')?.textContent?.trim() || '',
                description: doc.querySelector('meta[name="description"]')?.getAttribute('content') || '',
                author: doc.querySelector('meta[name="author"]')?.getAttribute('content') || '',
                publishedTime: doc.querySelector('meta[property="article:published_time"]')?.getAttribute('content') || '',
                modifiedTime: doc.querySelector('meta[property="article:modified_time"]')?.getAttribute('content') || '',
                siteName: doc.querySelector('meta[property="og:site_name"]')?.getAttribute('content') || '',
                url: url
            };

            // Remove unwanted elements
            const elementsToRemove = [
                'script',
                'style',
                'link',
                'meta',
                'noscript',
                'iframe',
                'object',
                'embed',
                'head',
                'nav',
                'header',
                'footer',
                'aside',
                '.advertisement',
                '.ads',
                '.sidebar',
                '.menu',
                '.navigation',
                '.comments',
                '.social-share',
                '.related-articles'
            ];

            elementsToRemove.forEach(selector => {
                const elements = doc.querySelectorAll(selector);
                elements.forEach(el => el.remove());
            });

            // Get the body content or fallback to full document if no body
            const body = doc.body || doc.documentElement;

            // Try to find the main article content
            const articleSelectors = [
                'article',
                '[role="main"]',
                '.main-content',
                '.article-content',
                '.post-content',
                '.entry-content',
                '.content',
                '#content',
                '.article-body',
                '.post-body'
            ];

            let mainContent = null;
            for (const selector of articleSelectors) {
                const element = doc.querySelector(selector);
                if (element && element.textContent.trim().length > 200) {
                    mainContent = element;
                    break;
                }
            }

            // If no main content found, use body
            if (!mainContent) {
                mainContent = body;
            }

            // Remove all style attributes and event handlers
            const allElements = mainContent.querySelectorAll('*');
            allElements.forEach(el => {
                el.removeAttribute('style');
                el.removeAttribute('class');
                el.removeAttribute('id');
                el.removeAttribute('onclick');
                el.removeAttribute('onload');
                
                // Remove other event handlers
                Array.from(el.attributes).forEach(attr => {
                    if (attr.name.startsWith('on')) {
                        el.removeAttribute(attr.name);
                    }
                });
            });

            // Extract clean text content
            const textContent = mainContent.textContent
                .replace(/\s+/g, ' ')
                .replace(/\n\s*\n/g, '\n')
                .trim();

            // Get clean HTML content
            const htmlContent = mainContent.innerHTML;

            const result = {
                url,
                metadata,
                textContent,
                htmlContent,
                contentLength: textContent.length,
                scrapedAt: new Date().toISOString()
            };

            logger.info(`✅ Successfully scraped ${textContent.length} characters from: ${url}`);
            return result;

        } catch (error) {
            logger.error(`❌ Error scraping webpage ${url}:`, { error: error.message });
            throw new Error(`Failed to scrape webpage: ${error.message}`);
        }
    }

    /**
     * Get content specifically optimized for AI summarization
     * @param {string} url - Article URL
     * @returns {Promise<string>} Content optimized for AI processing
     */
    async getContentForAI(url) {
        try {
            const webContent = await this.getWebpageContent(url);
            
            // Return structured content for AI
            let aiContent = '';

            // Add title if available
            if (webContent.metadata.title) {
                aiContent += `Title: ${webContent.metadata.title}\n\n`;
            }

            // Add description if available
            if (webContent.metadata.description) {
                aiContent += `Description: ${webContent.metadata.description}\n\n`;
            }

            // Add main content
            aiContent += `Content:\n${webContent.textContent}`;

            // Limit content length for AI processing (to avoid token limits)
            const maxLength = 8000; // Safe limit for GPT-4
            if (aiContent.length > maxLength) {
                aiContent = aiContent.substring(0, maxLength) + '\n\n[Content truncated for processing...]';
            }

            return {
                content: aiContent,
                originalData: webContent,
                isComplete: webContent.textContent.length <= maxLength
            };

        } catch (error) {
            logger.error(`❌ Error preparing content for AI from ${url}:`, { error: error.message });
            throw error;
        }
    }

    /**
     * Check if URL is scrapable
     * @param {string} url - URL to check
     * @returns {boolean} Whether URL can be scraped
     */
    isScrapableUrl(url) {
        if (!url) return false;
        
        const unscrappablePatterns = [
            /\.pdf$/i,
            /\.doc$/i,
            /\.docx$/i,
            /\.zip$/i,
            /\.rar$/i,
            /youtube\.com/i,
            /youtu\.be/i,
            /vimeo\.com/i,
            /twitter\.com/i,
            /facebook\.com/i,
            /instagram\.com/i,
            /linkedin\.com/i
        ];

        return !unscrappablePatterns.some(pattern => pattern.test(url));
    }

    /**
     * Get content with fallback for difficult sites
     * @param {string} url - Article URL
     * @param {Object} fallbackData - RSS data to use if scraping fails
     * @returns {Promise<string>} Content for AI processing
     */
    async getContentWithFallback(url, fallbackData = {}) {
        try {
            // Try normal scraping first
            return await this.getContentForAI(url);
        } catch (error) {
            logger.warn(`❌ Primary scraping failed for ${url}, creating fallback content:`, { error: error.message });
            
            // Create content from available RSS data
            let fallbackContent = '';
            
            if (fallbackData.title) {
                fallbackContent += `Title: ${fallbackData.title}\n\n`;
            }
            
            if (fallbackData.description) {
                fallbackContent += `Description: ${fallbackData.description}\n\n`;
            }
            
            if (fallbackData.content) {
                fallbackContent += `Content:\n${fallbackData.content}`;
            }
            
            // If we have minimal content, still return it
            if (fallbackContent.trim().length > 50) {
                logger.info(`📋 Using fallback content (${fallbackContent.length} characters) for ${url}`);
                return {
                    content: fallbackContent,
                    originalData: {
                        url,
                        metadata: fallbackData,
                        textContent: fallbackContent,
                        contentLength: fallbackContent.length,
                        scrapedAt: new Date().toISOString(),
                        fallbackUsed: true
                    },
                    isComplete: false,
                    isFallback: true
                };
            }
            
            // If no usable content, re-throw the error
            throw error;
        }
    }
}

export default new WebScraperService();
