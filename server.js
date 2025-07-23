import 'dotenv/config';
import { configs } from './config/config.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { PrismaClient } from '@prisma/client';
import winston from 'winston';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './docs/swagger.js';
import { response } from './utils/index.js';
import { auth, adminAuth, upload, validate } from './middleware/index.js';
import schemas from './schemas/index.js';
import apiRouter from './routes/index.js';
import { rssQueueService, aiSummaryQueueService } from './services/index.js';

const validation = validate(schemas);
const { singleUpload, multiUpload } = upload;

// Winston logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

if (configs.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple()
    }));
}

const app = express();
const prisma = new PrismaClient();

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
    origin: [
        'http://localhost:3000',
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:8080'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware
app.use((req, res, next) => {
    req.auth = auth;
    req.adminAuth = adminAuth;
    req.singleUpload = singleUpload;
    req.multiUpload = multiUpload;
    req.validate = validation.validate;
    req.schemas = schemas;
    next();
});

// Swagger docs route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api', apiRouter);

// Global error handling middleware
app.use((err, req, res, next) => {
    logger.error(err.stack);
    response.error(res, 'Internal server error', 500, err.message);
});

// Start server
const PORT = configs.PORT || 3000;
app.listen(PORT, async () => {
    try {
        await prisma.$connect();
        logger.info('Database connected');
        
        // Initialize RSS Queue Service
        // try {
        //     await rssQueueService.initialize();
        //     logger.info('RSS Queue Service initialized');
        // } catch (queueError) {
        //     logger.error('RSS Queue Service initialization failed:', queueError);
        //     // Continue without queue service if Redis is not available
        // }
        
        // // Initialize AI Summary Queue Service
        // try {
        //     await aiSummaryQueueService.initialize();
        //     logger.info('AI Summary Queue Service initialized');
        // } catch (aiQueueError) {
        //     logger.error('AI Summary Queue Service initialization failed:', aiQueueError);
        //     // Continue without AI queue service if initialization fails
        // }
        
        logger.info(`Server is running on port ${PORT}`);
    } catch (error) {
        logger.error('Database connection error:', error);
        process.exit(1);
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully');
    
    try {
        await rssQueueService.shutdown();
        logger.info('RSS Queue Service shutdown complete');
    } catch (error) {
        logger.error('Error shutting down RSS Queue Service:', error);
    }
    
    try {
        await aiSummaryQueueService.shutdown();
        logger.info('AI Summary Queue Service shutdown complete');
    } catch (error) {
        logger.error('Error shutting down AI Summary Queue Service:', error);
    }
    
    await prisma.$disconnect();
    process.exit(0);
});

process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully');
    
    try {
        await rssQueueService.shutdown();
        logger.info('RSS Queue Service shutdown complete');
    } catch (error) {
        logger.error('Error shutting down RSS Queue Service:', error);
    }
    
    try {
        await aiSummaryQueueService.shutdown();
        logger.info('AI Summary Queue Service shutdown complete');
    } catch (error) {
        logger.error('Error shutting down AI Summary Queue Service:', error);
    }
    
    await prisma.$disconnect();
    process.exit(0);
});

export { app, prisma };
