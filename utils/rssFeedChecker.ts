import fetch from 'node-fetch';

/**
 * RSS Feed Health Checker Utility
 * Checks if RSS feed URLs are accessible and responding
 */
class RSSFeedChecker {
    /**
     * Check if RSS feed URL is accessible
     * @param {string} url - RSS feed URL
     * @param {number} timeout - Request timeout in milliseconds
     * @returns {Promise<boolean>} true if active, false if inactive
     */
    static async checkFeedHealth(url, timeout = 5000) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);

            const response = await fetch(url, {
                method: 'HEAD',
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Jarayid RSS Feed Checker/1.0'
                }
            });

            clearTimeout(timeoutId);
            return response.ok && (response.status >= 200 && response.status < 300);
        } catch (error) {
            return false;
        }
    }

    /**
     * Check multiple RSS feeds concurrently and return active status
     * @param {Array} rssFeeds - Array of RSS feed objects with url property
     * @returns {Promise<Array>} RSS feeds with active status added
     */
    static async addActiveStatus(rssFeeds) {
        if (!rssFeeds || rssFeeds.length === 0) {
            return rssFeeds;
        }

        const healthPromises = rssFeeds.map(async (feed) => {
            const active = await this.checkFeedHealth(feed.url);
            return {
                ...feed,
                active
            };
        });

        return await Promise.all(healthPromises);
    }
}

export default RSSFeedChecker;
