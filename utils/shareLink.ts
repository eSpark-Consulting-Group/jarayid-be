import { PASSWORD_RESET_CONFIG } from '../config/config.js';

/**
 * Utility functions for generating shareable links
 */

/**
 * Generate a shareable link for an article
 * @param {string} articleId - The unique ID of the article
 * @param {string} title - Optional article title for SEO-friendly URL
 * @param {string} baseUrl - Optional custom base URL (defaults to config)
 * @returns {string} The complete shareable link
 */
export const generateArticleShareLink = (articleId, title = null, baseUrl = null) => {
    if (!articleId) {
        throw new Error('Article ID is required to generate share link');
    }

    // Use provided baseUrl or fallback to config
    const frontendUrl = baseUrl || PASSWORD_RESET_CONFIG.frontendUrl || 'http://localhost:3000';
    
    // Remove trailing slash if present
    const cleanBaseUrl = frontendUrl.replace(/\/$/, '');
    
    // Create SEO-friendly slug from title if provided
    let urlPath = `/articles/${articleId}`;
    
    if (title) {
        const slug = title
            .toLowerCase()
            .trim()
            .replace(/[^\w\s-]/g, '') // Remove special characters
            .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
            .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
        
        if (slug) {
            urlPath = `/articles/${articleId}/${slug}`;
        }
    }
    
    return `${cleanBaseUrl}${urlPath}`;
};

/**
 * Generate multiple share links for social media platforms
 * @param {string} articleId - The unique ID of the article
 * @param {string} title - Article title
 * @param {string} description - Article description/summary
 * @param {string} baseUrl - Optional custom base URL
 * @returns {object} Object containing various share links
 */
export const generateSocialShareLinks = (articleId, title = '', description = '', baseUrl = null) => {
    const articleUrl = generateArticleShareLink(articleId, title, baseUrl);
    const encodedUrl = encodeURIComponent(articleUrl);
    const encodedTitle = encodeURIComponent(title);
    const encodedDescription = encodeURIComponent(description);
    
    // Website sharing URLs
    const frontendUrl = baseUrl || PASSWORD_RESET_CONFIG.frontendUrl || 'http://localhost:3000';
    const websiteUrl = frontendUrl.replace(/\/$/, '');
    const encodedWebsiteUrl = encodeURIComponent(websiteUrl);
    const websiteTitle = 'Jarayid News';
    const encodedWebsiteTitle = encodeURIComponent(websiteTitle);
    const websiteDescription = 'Your trusted source for news from around the world';
    const encodedWebsiteDescription = encodeURIComponent(websiteDescription);
    
    return {
        direct: articleUrl,
        facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
        twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
        linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
        whatsapp: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
        telegram: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
        email: `mailto:?subject=${encodedTitle}&body=${encodedDescription}%0A%0A${encodedUrl}`,
        tiktok: `https://www.tiktok.com/share?url=${encodedUrl}&text=${encodedTitle}`,
        copy: articleUrl, // For copy to clipboard functionality
        
        // Website sharing URLs
        siteFacebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedWebsiteUrl}`,
        siteTwitter: `https://twitter.com/intent/tweet?url=${encodedWebsiteUrl}&text=${encodedWebsiteTitle}`,
        siteLinkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedWebsiteUrl}`,
        siteWhatsapp: `https://wa.me/?text=${encodedWebsiteTitle}%20${encodedWebsiteUrl}`,
        siteTelegram: `https://t.me/share/url?url=${encodedWebsiteUrl}&text=${encodedWebsiteTitle}`,
        siteEmail: `mailto:?subject=${encodedWebsiteTitle}&body=${encodedWebsiteDescription}%0A%0A${encodedWebsiteUrl}`,
        siteTiktok: `https://www.tiktok.com/share?url=${encodedWebsiteUrl}&text=${encodedWebsiteTitle}`,
        siteDirect: websiteUrl,
        siteCopy: websiteUrl
    };
};

/**
 * Generate a QR code-friendly short link (placeholder for future QR implementation)
 * @param {string} articleId - The unique ID of the article
 * @param {string} baseUrl - Optional custom base URL
 * @returns {string} Short link suitable for QR codes
 */
export const generateShortShareLink = (articleId, baseUrl = null) => {
    const frontendUrl = baseUrl || PASSWORD_RESET_CONFIG.frontendUrl || 'http://localhost:3000';
    const cleanBaseUrl = frontendUrl.replace(/\/$/, '');
    
    return `${cleanBaseUrl}/a/${articleId}`;
};

/**
 * Add share links to article object
 * @param {object} article - The article object
 * @param {string} baseUrl - Optional custom base URL
 * @returns {object} Article object with added shareLinks property
 */
export const addShareLinksToArticle = (article, baseUrl = null) => {
    if (!article || !article.id) {
        return article;
    }

    const title = article.title || 'Article';
    const description = article.summaryEnglish || article.summaryArabic || article.title || '';
    
    return {
        ...article,
        shareLinks: {
            ...generateSocialShareLinks(article.id, title, description, baseUrl),
            short: generateShortShareLink(article.id, baseUrl)
        }
    };
};

export default {
    generateArticleShareLink,
    generateSocialShareLinks,
    generateShortShareLink,
    addShareLinksToArticle
};
