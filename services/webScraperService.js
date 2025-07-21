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
     * Fetch HTML content from URL
     * @param {string} url - The URL to fetch
     * @returns {Promise<string>} HTML content
     */
    async fetchHTML(url) {
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https://') ? https : http;
            
            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                timeout: 30000
            };

            const req = client.get(url, options, (res) => {
                // Handle redirects
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    logger.info(`Following redirect from ${url} to ${res.headers.location}`);
                    return this.fetchHTML(res.headers.location).then(resolve).catch(reject);
                }

                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
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

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.setTimeout(30000);
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
}

export default new WebScraperService();
