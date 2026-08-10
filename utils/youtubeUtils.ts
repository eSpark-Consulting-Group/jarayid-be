/**
 * YouTube utility functions
 * Handles YouTube URL parsing and thumbnail generation
 */

/**
 * Extract YouTube video ID from various YouTube URL formats
 * @param {string} url - YouTube URL
 * @returns {string|null} - Video ID or null if not found
 */
export function extractVideoId(url) {
    if (!url || typeof url !== 'string') {
        return null;
    }

    // Remove any whitespace
    url = url.trim();

    // YouTube URL patterns
    const patterns = [
        // Standard YouTube URLs
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        // YouTube Shorts URLs
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
        // YouTube embed URLs
        /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
        // YouTube URLs with additional parameters
        /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
}

/**
 * Generate YouTube thumbnail URL from video ID
 * @param {string} videoId - YouTube video ID
 * @param {string} quality - Thumbnail quality (default, mqdefault, hqdefault, sddefault, maxresdefault)
 * @returns {string} - Thumbnail URL
 */
export function generateThumbnailUrl(videoId, quality = 'hqdefault') {
    if (!videoId) {
        return null;
    }

    // Available thumbnail qualities:
    // default - 120x90
    // mqdefault - 320x180 (medium quality)
    // hqdefault - 480x360 (high quality)
    // sddefault - 640x480 (standard definition)
    // maxresdefault - 1280x720 (maximum resolution, may not be available for all videos)

    return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Get multiple thumbnail URLs for different qualities
 * @param {string} videoId - YouTube video ID
 * @returns {object} - Object containing different quality thumbnail URLs
 */
export function getAllThumbnailUrls(videoId) {
    if (!videoId) {
        return null;
    }

    return {
        default: generateThumbnailUrl(videoId, 'default'),
        medium: generateThumbnailUrl(videoId, 'mqdefault'),
        high: generateThumbnailUrl(videoId, 'hqdefault'),
        standard: generateThumbnailUrl(videoId, 'sddefault'),
        maxres: generateThumbnailUrl(videoId, 'maxresdefault')
    };
}

/**
 * Validate if URL is a valid YouTube URL
 * @param {string} url - URL to validate
 * @returns {boolean} - True if valid YouTube URL
 */
export function isValidYouTubeUrl(url) {
    if (!url || typeof url !== 'string') {
        return false;
    }

    const videoId = extractVideoId(url);
    return videoId !== null && videoId.length === 11;
}

/**
 * Extract YouTube URL info including video ID, type, and thumbnail
 * @param {string} url - YouTube URL
 * @returns {object|null} - Object with video info or null if invalid
 */
export function extractYouTubeInfo(url) {
    if (!url || typeof url !== 'string') {
        return null;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
        return null;
    }

    // Determine content type based on URL
    const isShorts = url.includes('/shorts/');
    const contentType = isShorts ? 'SHORTS' : 'FULL_VIDEO';

    return {
        videoId,
        contentType,
        thumbnailUrl: generateThumbnailUrl(videoId, 'hqdefault'),
        thumbnails: getAllThumbnailUrls(videoId),
        isShorts,
        originalUrl: url
    };
}

export default {
    extractVideoId,
    generateThumbnailUrl,
    getAllThumbnailUrls,
    isValidYouTubeUrl,
    extractYouTubeInfo
};
