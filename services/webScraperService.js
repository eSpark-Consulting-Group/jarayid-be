import https from 'https';
import http from 'http';
import { JSDOM } from 'jsdom';
import winston from 'winston';
import zlib from 'zlib';
import { promisify } from 'util';

// Promisify zlib functions for async/await
const gunzip = promisify(zlib.gunzip);
const inflate = promisify(zlib.inflate);
const brotliDecompress = promisify(zlib.brotliDecompress);

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
     * Properly decode response based on content encoding and charset
     * @param {Buffer} buffer - Response buffer
     * @param {Object} headers - Response headers
     * @returns {Promise<string>} Decoded HTML string
     */
    async decodeResponse(buffer, headers) {
        try {
            let decodedBuffer = buffer;
            const contentEncoding = headers['content-encoding'];
            
            // Handle compression
            if (contentEncoding) {
                logger.info(`🔄 Decompressing content with encoding: ${contentEncoding}`);
                
                switch (contentEncoding.toLowerCase()) {
                    case 'gzip':
                        decodedBuffer = await gunzip(buffer);
                        break;
                    case 'deflate':
                        decodedBuffer = await inflate(buffer);
                        break;
                    case 'br':
                    case 'brotli':
                        decodedBuffer = await brotliDecompress(buffer);
                        break;
                    default:
                        logger.warn(`⚠️ Unknown content encoding: ${contentEncoding}`);
                }
            }

            // Determine character encoding
            let encoding = 'utf8';
            const contentType = headers['content-type'] || '';
            
            // Extract charset from content-type header
            const charsetMatch = contentType.match(/charset=([^;]+)/i);
            if (charsetMatch) {
                encoding = charsetMatch[1].toLowerCase();
                // Normalize common encoding names
                if (encoding === 'utf-8') encoding = 'utf8';
                logger.info(`📝 Using charset from header: ${encoding}`);
            }

            // Convert buffer to string with proper encoding
            let html = decodedBuffer.toString(encoding);

            // Check for BOM and remove if present
            if (html.charCodeAt(0) === 0xFEFF) {
                html = html.slice(1);
            }

            // Fallback: Try to detect encoding from HTML meta tags if still using utf8
            if (encoding === 'utf8' && html.includes('charset=')) {
                const metaCharsetMatch = html.match(/<meta[^>]*charset=["']?([^"'>]+)/i);
                if (metaCharsetMatch && metaCharsetMatch[1].toLowerCase() !== 'utf-8') {
                    const detectedEncoding = metaCharsetMatch[1].toLowerCase();
                    logger.info(`🔍 Detected different encoding from meta tag: ${detectedEncoding}`);
                    
                    // Re-decode with detected encoding if it's different
                    try {
                        if (detectedEncoding === 'utf-8') {
                            // Already using utf8, no need to re-decode
                        } else {
                            html = decodedBuffer.toString(detectedEncoding === 'utf-8' ? 'utf8' : detectedEncoding);
                        }
                    } catch (encodingError) {
                        logger.warn(`⚠️ Failed to decode with detected encoding ${detectedEncoding}, using utf8`);
                    }
                }
            }

            // Validate that we got actual text content
            if (html.includes('\ufffd') || /[\x00-\x08\x0E-\x1F\x7F]/.test(html.slice(0, 200))) {
                throw new Error('Content appears to be binary or corrupted after decoding');
            }

            return html;

        } catch (error) {
            logger.error('❌ Error decoding response:', { error: error.message });
            // Last resort: try simple utf8 conversion
            try {
                return buffer.toString('utf8');
            } catch (fallbackError) {
                throw new Error(`Failed to decode response: ${error.message}`);
            }
        }
    }

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
     * Get enhanced headers with better anti-bot evasion
     * @param {string} hostname - The hostname of the target site
     * @returns {Object} Headers object
     */
    getEnhancedHeaders(hostname) {
        const baseHeaders = {
            'User-Agent': this.getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
            'Accept-Language': 'ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1'
        };

        // Add site-specific headers for common Arabic news sites
        if (hostname.includes('almasryalyoum.com')) {
            baseHeaders['Referer'] = `https://${hostname}/`;
            baseHeaders['Origin'] = `https://${hostname}`;
            baseHeaders['Accept-Language'] = 'ar,en-US;q=0.9,en;q=0.8';
        } else if (hostname.includes('youm7.com')) {
            baseHeaders['Referer'] = `https://${hostname}/`;
            baseHeaders['Origin'] = `https://${hostname}`;
            baseHeaders['Accept-Language'] = 'ar-EG,ar;q=0.9,en;q=0.8';
        } else if (hostname.includes('alahram.org.eg')) {
            baseHeaders['Referer'] = `https://${hostname}/`;
            baseHeaders['Accept-Language'] = 'ar,en;q=0.9';
        } else {
            // Generic approach for other sites
            baseHeaders['Referer'] = `https://${hostname}/`;
        }

        return baseHeaders;
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
                // Add progressive delay between requests
                if (retryCount > 0) {
                    const delayTime = Math.min(2000 * Math.pow(2, retryCount), 10000); // Exponential backoff
                    logger.info(`⏳ Waiting ${delayTime}ms before retry ${retryCount}`);
                    await new Promise(resolve => setTimeout(resolve, delayTime));
                } else {
                    // Small initial delay to seem more human-like
                    await this.randomDelay(500, 1500);
                }

                const client = url.startsWith('https://') ? https : http;
                const parsedUrl = new URL(url);
                
                // Get enhanced headers for better anti-bot evasion
                const headers = this.getEnhancedHeaders(parsedUrl.hostname);
                
                const options = {
                    hostname: parsedUrl.hostname,
                    port: parsedUrl.port,
                    path: parsedUrl.pathname + parsedUrl.search,
                    method: 'GET',
                    headers,
                    timeout: 30000,
                    // Add some additional options for better compatibility
                    rejectUnauthorized: false, // Allow self-signed certificates
                    maxHeaderSize: 16384 // Increase header size limit
                };

                logger.info(`🔍 Attempting to fetch: ${url} (attempt ${retryCount + 1}/${maxRetries + 1})`);

                const req = client.request(options, (res) => {
                    // Handle redirects
                    if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                        logger.info(`🔄 Following redirect from ${url} to ${res.headers.location}`);
                        return this.fetchHTML(res.headers.location, retryCount).then(resolve).catch(reject);
                    }

                    // Enhanced 403 handling with specific strategies
                    if (res.statusCode === 403) {
                        logger.warn(`🚫 403 Forbidden detected for ${url}`);
                        
                        if (retryCount < maxRetries) {
                            logger.warn(`🔄 Retrying with enhanced headers ${retryCount + 1}/${maxRetries} for ${url}`);
                            
                            // Try different strategies for different retry attempts
                            if (retryCount === 0) {
                                // First retry: Wait longer
                                return new Promise(resolve => setTimeout(resolve, 5000))
                                    .then(() => this.fetchHTML(url, retryCount + 1))
                                    .then(resolve).catch(reject);
                            } else if (retryCount === 1) {
                                // Second retry: Try with different user agent
                                return new Promise(resolve => setTimeout(resolve, 8000))
                                    .then(() => this.fetchHTML(url, retryCount + 1))
                                    .then(resolve).catch(reject);
                            }
                        }
                        
                        const error = new Error(`HTTP ${res.statusCode}: Forbidden - Anti-bot protection detected after ${retryCount + 1} attempts`);
                        reject(error);
                        return;
                    }

                    // Handle other error status codes
                    if (res.statusCode !== 200) {
                        const error = new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`);
                        
                        // Retry on server errors and rate limiting
                        if (retryCount < maxRetries && [429, 502, 503, 504, 520, 521, 522, 524].includes(res.statusCode)) {
                            logger.warn(`🔄 Retrying request ${retryCount + 1}/${maxRetries} for ${url} (Status: ${res.statusCode})`);
                            
                            const retryDelay = [429].includes(res.statusCode) ? 
                                Math.min(10000 * Math.pow(2, retryCount), 60000) : // Longer delay for rate limiting
                                Math.min(3000 * Math.pow(2, retryCount), 15000);   // Progressive delay for server errors
                            
                            return new Promise(resolve => setTimeout(resolve, retryDelay))
                                .then(() => this.fetchHTML(url, retryCount + 1))
                                .then(resolve).catch(reject);
                        }
                        
                        reject(error);
                        return;
                    }

                    // Collect response data as buffer to handle encoding properly
                    const chunks = [];
                    
                    // Don't set encoding - we'll handle it manually
                    res.on('data', chunk => {
                        chunks.push(chunk);
                    });

                    res.on('end', async () => {
                        try {
                            // Combine all chunks into a single buffer
                            const buffer = Buffer.concat(chunks);
                            
                            // Decode the response properly
                            const decodedHtml = await this.decodeResponse(buffer, res.headers);
                            
                            // Validate that we got actual HTML content
                            if (!decodedHtml || decodedHtml.length < 100) {
                                throw new Error('Response too short or empty');
                            }
                            
                            // Check if the content looks like HTML
                            const htmlLower = decodedHtml.toLowerCase();
                            if (!htmlLower.includes('<html') && !htmlLower.includes('<!doctype') && !htmlLower.includes('<body')) {
                                // Check if this might be a challenge page or captcha
                                if (htmlLower.includes('cloudflare') || htmlLower.includes('challenge') || htmlLower.includes('captcha')) {
                                    throw new Error('Received challenge page - enhanced protection detected');
                                }
                                logger.warn('⚠️ Content does not appear to be HTML');
                            }
                            
                            logger.info(`✅ Successfully fetched and decoded HTML: ${decodedHtml.length} characters`);
                            resolve(decodedHtml);
                            
                        } catch (decodeError) {
                            logger.error('❌ Error decoding response:', { error: decodeError.message, url });
                            if (retryCount < maxRetries) {
                                logger.warn(`🔄 Retrying request ${retryCount + 1}/${maxRetries} for ${url} (Decode error)`);
                                return this.fetchHTML(url, retryCount + 1).then(resolve).catch(reject);
                            }
                            reject(new Error(`Failed to decode response: ${decodeError.message}`));
                        }
                    });
                });

                req.on('error', (err) => {
                    logger.error(`🔌 Request error for ${url}:`, { error: err.message });
                    if (retryCount < maxRetries) {
                        logger.warn(`🔄 Retrying request ${retryCount + 1}/${maxRetries} for ${url} (Network error: ${err.message})`);
                        return this.fetchHTML(url, retryCount + 1).then(resolve).catch(reject);
                    }
                    reject(err);
                });

                req.on('timeout', () => {
                    req.destroy();
                    const error = new Error('Request timeout after 30 seconds');
                    logger.error(`⏰ Timeout for ${url}`);
                    if (retryCount < maxRetries) {
                        logger.warn(`🔄 Retrying request ${retryCount + 1}/${maxRetries} for ${url} (Timeout)`);
                        return this.fetchHTML(url, retryCount + 1).then(resolve).catch(reject);
                    }
                    reject(error);
                });

                req.setTimeout(30000);
                req.end();

            } catch (error) {
                logger.error(`💥 Unexpected error for ${url}:`, { error: error.message });
                if (retryCount < maxRetries) {
                    logger.warn(`🔄 Retrying request ${retryCount + 1}/${maxRetries} for ${url} (Unexpected error: ${error.message})`);
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
                .replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '') // Remove non-printable characters
                .trim();

            // Get clean HTML content
            let htmlContent = mainContent.innerHTML;
            
            // Clean up HTML content to remove any remaining binary characters
            htmlContent = htmlContent.replace(/[^\x20-\x7E\u00A0-\uFFFF]/g, '');

            const result = {
                url,
                metadata,
                textContent,
                htmlContent,
                contentLength: textContent.length,
                scrapedAt: new Date().toISOString(),
                isClean: !textContent.includes('\ufffd') && !htmlContent.includes('\ufffd')
            };

            logger.info(`✅ Successfully scraped ${textContent.length} characters from: ${url}`);
            
            // Log warning if content appears corrupted
            if (!result.isClean) {
                logger.warn(`⚠️ Content may contain encoding issues for: ${url}`);
            }
            
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
     * Test scraping capability and encoding handling for a URL
     * @param {string} url - URL to test
     * @returns {Promise<Object>} Test results and diagnostics
     */
    async testScrapingDiagnostics(url) {
        try {
            logger.info(`🧪 Testing scraping diagnostics for: ${url}`);
            
            const startTime = Date.now();
            const html = await this.fetchHTML(url, 0); // Single attempt for testing
            const fetchTime = Date.now() - startTime;
            
            // Basic content analysis
            const contentLength = html.length;
            const hasValidHtml = html.toLowerCase().includes('<html') || html.toLowerCase().includes('<!doctype') || html.toLowerCase().includes('<body');
            const hasBinaryChars = /[\x00-\x08\x0E-\x1F\x7F]/.test(html.slice(0, 1000));
            const hasReplacementChars = html.includes('\ufffd');
            const contentPreview = html.substring(0, 300).replace(/\n/g, '\\n');
            
            // Try content extraction
            let extractionResult = null;
            try {
                extractionResult = await this.getWebpageContent(url);
            } catch (extractError) {
                extractionResult = { error: extractError.message };
            }
            
            const diagnostics = {
                url,
                success: true,
                fetchTime: `${fetchTime}ms`,
                contentLength,
                hasValidHtml,
                hasBinaryChars,
                hasReplacementChars,
                contentPreview,
                isClean: !hasBinaryChars && !hasReplacementChars,
                extraction: extractionResult ? {
                    success: !extractionResult.error,
                    textLength: extractionResult.textContent?.length || 0,
                    isClean: extractionResult.isClean || false,
                    error: extractionResult.error
                } : null,
                recommendations: []
            };
            
            // Add recommendations based on diagnostics
            if (hasBinaryChars || hasReplacementChars) {
                diagnostics.recommendations.push('Content contains binary or corrupted characters - encoding issues detected');
            }
            if (!hasValidHtml) {
                diagnostics.recommendations.push('Content does not appear to be valid HTML');
            }
            if (contentLength < 1000) {
                diagnostics.recommendations.push('Content is very short - may be blocked or incomplete');
            }
            if (diagnostics.isClean && hasValidHtml && contentLength > 1000) {
                diagnostics.recommendations.push('Content looks good - scraping should work well');
            }
            
            logger.info(`🧪 Diagnostics complete for ${url}: ${diagnostics.isClean ? 'CLEAN' : 'ISSUES DETECTED'}`);
            return diagnostics;
            
        } catch (error) {
            return {
                url,
                success: false,
                error: error.message,
                recommendations: ['Failed to fetch content - check URL accessibility and network connectivity']
            };
        }
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
