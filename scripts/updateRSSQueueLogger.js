import fs from 'fs';

const filePath = 'd:\\jarayid-be\\services\\rssQueueService.js';

try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace all console.log statements with logger.info
    content = content.replace(/console\.log\(`([^`]+)`\);/g, 'logger.info(`$1`);');
    content = content.replace(/console\.log\('([^']+)'\);/g, 'logger.info(\'$1\');');
    content = content.replace(/console\.log\("([^"]+)"\);/g, 'logger.info("$1");');
    
    // Replace console.error statements with logger.error
    content = content.replace(/console\.error\('([^']+)',\s*([^)]+)\);/g, 'logger.error(\'$1\', { error: $2?.message || $2 });');
    content = content.replace(/console\.error\("([^"]+)",\s*([^)]+)\);/g, 'logger.error("$1", { error: $2?.message || $2 });');
    content = content.replace(/console\.error\(`([^`]+)`,\s*([^)]+)\);/g, 'logger.error(`$1`, { error: $2?.message || $2 });');
    
    // Replace console.warn statements with logger.warn
    content = content.replace(/console\.warn\(`([^`]+)`\);/g, 'logger.warn(`$1`);');
    content = content.replace(/console\.warn\('([^']+)'\);/g, 'logger.warn(\'$1\');');
    content = content.replace(/console\.warn\("([^"]+)"\);/g, 'logger.warn("$1");');
    
    fs.writeFileSync(filePath, content);
console.log('✅ Updated RSS Queue Service console statements to logger');
    
} catch (error) {
    console.error('❌ Failed to update RSS Queue Service:', error.message);
}
