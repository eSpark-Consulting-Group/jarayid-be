import fs from 'fs';
import path from 'path';

// Controllers to update
const controllers = [
    'd:\\jarayid-be\\controllers\\articleController.js',
    'd:\\jarayid-be\\controllers\\rssFeedController.js',
    'd:\\jarayid-be\\controllers\\userController.js',
    'd:\\jarayid-be\\controllers\\categoryController.js'
];

// Update console statements to logger
function updateConsoleToLogger(filePath, controllerName) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Add winston import if not present
        if (!content.includes('import winston from \'winston\'')) {
            const importLines = content.split('\n');
            let insertIndex = 0;
            
            // Find where to insert winston import (after other imports)
            for (let i = 0; i < importLines.length; i++) {
                if (importLines[i].startsWith('import ') && !importLines[i].includes('winston')) {
                    insertIndex = i + 1;
                }
            }
            
            // Insert winston import
            importLines.splice(insertIndex, 0, 'import winston from \'winston\';');
            
            // Insert logger configuration
            const loggerConfig = `
// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return \`\${timestamp} [\${level.toUpperCase()}] ${controllerName}: \${message} \${Object.keys(meta).length ? JSON.stringify(meta) : ''}\`;
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
`;
            
            // Insert logger config after imports
            let configInsertIndex = insertIndex + 1;
            for (let i = configInsertIndex; i < importLines.length; i++) {
                if (!importLines[i].startsWith('import ') && importLines[i].trim() !== '') {
                    configInsertIndex = i;
                    break;
                }
            }
            
            importLines.splice(configInsertIndex, 0, loggerConfig);
            content = importLines.join('\n');
        }
        
        // Replace console.error statements
        content = content.replace(
            /console\.error\(['"`]([^'"`]+)['"`],\s*([^)]+)\);/g,
            'logger.error(\'$1\', { error: $2?.message || $2 });'
        );
        
        // Replace console.log statements
        content = content.replace(
            /console\.log\(['"`]([^'"`]+)['"`]\);/g,
            'logger.info(\'$1\');'
        );
        
        // Replace console.log with variables
        content = content.replace(
            /console\.log\(`([^`]+)`\);/g,
            'logger.info(`$1`);'
        );
        
        // Replace console.warn statements
        content = content.replace(
            /console\.warn\(['"`]([^'"`]+)['"`],\s*([^)]+)\);/g,
            'logger.warn(\'$1\', { error: $2?.message || $2 });'
        );
        
        fs.writeFileSync(filePath, content);
        // console.log(`✅ Updated ${controllerName}`);
        
    } catch (error) {
        console.error(`❌ Failed to update ${controllerName}:`, error.message);
    }
}

// Update all controllers
controllers.forEach(filePath => {
    const fileName = path.basename(filePath);
    const controllerName = fileName.replace('.js', '').replace('Controller', ' Controller');
    
    if (fs.existsSync(filePath)) {
        updateConsoleToLogger(filePath, controllerName);
    } else {
        // console.log(`⚠️  File not found: ${filePath}`);
    }
});

// console.log('\n🎉 All controllers updated with proper logging!');
