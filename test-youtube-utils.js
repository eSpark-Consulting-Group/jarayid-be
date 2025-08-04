/**
 * YouTube Thumbnail Utility Test Script
 * This script demonstrates how to use the YouTube utilities for extracting thumbnails
 */

import { youtubeUtils } from './utils/index.js';

// Test URLs
const testUrls = [
    'https://youtube.com/shorts/So_SZR1MhWE?si=PlWL75Rcb0BF4ZLh',
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://youtube.com/shorts/abc123xyz',
    'https://www.youtube.com/embed/dQw4w9WgXcQ'
];

console.log('🧪 Testing YouTube Thumbnail Utilities\n');

testUrls.forEach((url, index) => {
    console.log(`\n${index + 1}. Testing URL: ${url}`);
    
    // Check if URL is valid
    const isValid = youtubeUtils.isValidYouTubeUrl(url);
    console.log(`   Valid: ${isValid}`);
    
    if (isValid) {
        // Extract video ID
        const videoId = youtubeUtils.extractVideoId(url);
        console.log(`   Video ID: ${videoId}`);
        
        // Get YouTube info
        const info = youtubeUtils.extractYouTubeInfo(url);
        console.log(`   Content Type: ${info.contentType}`);
        console.log(`   Is Shorts: ${info.isShorts}`);
        console.log(`   Default Thumbnail: ${info.thumbnailUrl}`);
        
        // Get all thumbnail alternatives
        console.log('   Thumbnail Alternatives:');
        Object.entries(info.thumbnails).forEach(([quality, url]) => {
            console.log(`     ${quality}: ${url}`);
        });
    }
    
    console.log('   ' + '-'.repeat(80));
});

console.log('\n✅ Test completed!\n');

// Example usage for specific YouTube Shorts URL
console.log('📱 Specific YouTube Shorts Example:');
const shortsUrl = 'https://youtube.com/shorts/So_SZR1MhWE?si=PlWL75Rcb0BF4ZLh';
const shortsInfo = youtubeUtils.extractYouTubeInfo(shortsUrl);

if (shortsInfo) {
    console.log(`Video ID: ${shortsInfo.videoId}`);
    console.log(`Content Type: ${shortsInfo.contentType}`);
    console.log(`Recommended Thumbnail URL: ${shortsInfo.thumbnailUrl}`);
    console.log('\nAll available thumbnail sizes:');
    console.log(`• Default (120x90): ${shortsInfo.thumbnails.default}`);
    console.log(`• Medium (320x180): ${shortsInfo.thumbnails.medium}`);
    console.log(`• High (480x360): ${shortsInfo.thumbnails.high}`);
    console.log(`• Standard (640x480): ${shortsInfo.thumbnails.standard}`);
    console.log(`• Max Resolution (1280x720): ${shortsInfo.thumbnails.maxres}`);
}
