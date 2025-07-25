import { PrismaClient } from '@prisma/client';
import winston from 'winston';

// Logger for Prisma operations
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] Prisma: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// Create a single Prisma Client instance with optimized settings
const prisma = new PrismaClient({
    log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'info' },
        { emit: 'event', level: 'warn' },
        { emit: 'event', level: 'error' }
    ],
    errorFormat: 'pretty',
    datasources: {
        db: {
            url: process.env.DATABASE_URL
        }
    }
});

// Setup Prisma event logging
prisma.$on('query', (e) => {
    logger.debug(`Query: ${e.query} - Duration: ${e.duration}ms`);
});

prisma.$on('info', (e) => {
    logger.info(`Prisma Info: ${e.message}`);
});

prisma.$on('warn', (e) => {
    logger.warn(`Prisma Warning: ${e.message}`);
});

prisma.$on('error', (e) => {
    logger.error(`Prisma Error: ${e.message}`);
});

// Graceful shutdown function
const disconnectPrisma = async () => {
    try {
        logger.info('🔌 Disconnecting from database...');
        await prisma.$disconnect();
        logger.info('✅ Successfully disconnected from database');
    } catch (error) {
        logger.error('❌ Error disconnecting from database:', error);
    }
};

// Handle various shutdown signals
const setupGracefulShutdown = () => {
    const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    
    signals.forEach(signal => {
        process.on(signal, async () => {
            logger.info(`🛑 Received ${signal}, initiating graceful shutdown...`);
            await disconnectPrisma();
            process.exit(0);
        });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
        logger.error('❌ Uncaught Exception:', error);
        await disconnectPrisma();
        process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
        logger.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
        await disconnectPrisma();
        process.exit(1);
    });

    // Handle beforeExit
    process.on('beforeExit', async () => {
        logger.info('🔄 Process is about to exit, disconnecting database...');
        await disconnectPrisma();
    });
};

// Initialize graceful shutdown
setupGracefulShutdown();

logger.info('🗄️ Prisma client initialized with graceful shutdown handlers');

// Export both the instance and disconnect function
export { disconnectPrisma };
export default prisma;
