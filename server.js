import 'dotenv/config';
import { configs } from './config/config.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import prisma, { disconnectPrisma } from './prisma/index.js';
import winston from 'winston';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './docs/swagger.js';
import { response } from './utils/index.js';
import { auth, adminAuth, upload, validate } from './middleware/index.js';
import schemas from './schemas/index.js';
import apiRouter from './routes/index.js';
import { rssQueueService, aiSummaryQueueService, trialService } from './services/index.js';
import { errorHandler } from './middleware/index.js';

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

// Middleware
app.use(helmet());
app.use(compression());

// Middleware
app.use(helmet());
app.use(compression());

// Enhanced CORS configuration with environment-based origins
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (mobile apps, postman, etc.)
        if (!origin) return callback(null, true);
        
        // Get origins from environment variable or use defaults
        const envOrigins = process.env.CORS_ORIGINS 
            ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
            : [];
            
        const allowedOrigins = [
            'http://localhost:3000',
            'http://localhost:8080',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:8080',
            'https://jarayid.esparkconsultants.com',
            'https://jarayid.esparkconsultants.com/',
            'https://www.jarayid.esparkconsultants.com',
            'https://www.jarayid.esparkconsultants.com/',
            // Add staging/development domains
            'https://jarayid-frontend.vercel.app',
            'https://jarayid-frontend.netlify.app',
            ...envOrigins
        ];
        
        // Allow any localhost/127.0.0.1 origins in development
        if (process.env.NODE_ENV === 'development') {
            if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
                return callback(null, true);
            }
        }
        
        if (allowedOrigins.includes(origin) || allowedOrigins.includes(origin + '/')) {
            callback(null, true);
        } else {
            console.log('CORS blocked origin:', origin);
            console.log('Allowed origins:', allowedOrigins);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cache-Control',
        'X-File-Name',
        'X-CSRF-Token',
        'Access-Control-Allow-Origin'
    ],
    exposedHeaders: ['Content-Length', 'Content-Type', 'Authorization'],
    optionsSuccessStatus: 200, // For legacy browser support
    preflightContinue: false
};

app.use(cors(corsOptions));

// Additional CORS handling for preflight requests
app.options('*', cors(corsOptions));

// CORS debugging middleware (can be removed in production)
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'development') {
        console.log(`CORS Request: ${req.method} ${req.url} from ${req.headers.origin || 'no-origin'}`);
    }
    next();
});
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
app.use(errorHandler);

// Start server
const PORT = configs.PORT || 3000;
app.listen(PORT, async () => {
    try {
        await prisma.$connect();
        logger.info('Database connected');
        
        // Initialize RSS Queue Service
        try {
            await rssQueueService.initialize();
            logger.info('RSS Queue Service initialized');
        } catch (queueError) {
            logger.error('RSS Queue Service initialization failed:', queueError);
            // Continue without queue service if Redis is not available
        }
        
        // Initialize AI Summary Queue Service
        try {
            await aiSummaryQueueService.initialize();
            logger.info('AI Summary Queue Service initialized');
        } catch (aiQueueError) {
            logger.error('AI Summary Queue Service initialization failed:', aiQueueError);
            // Continue without AI queue service if initialization fails
        }
        
        // Initialize Trial Expiration Checker
        try {
            // Run trial expiration check immediately on startup
            await trialService.checkAndExpireTrials();
            
            // Set up recurring trial expiration check (every hour)
            setInterval(async () => {
                try {
                    await trialService.checkAndExpireTrials();
                } catch (trialError) {
                    logger.error('Trial expiration check failed:', trialError);
                }
            }, 60 * 60 * 1000); // 1 hour in milliseconds
            
            logger.info('Trial expiration checker initialized');
        } catch (trialError) {
            logger.error('Trial expiration checker initialization failed:', trialError);
            // Continue without trial checker if initialization fails
        }
        
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
    
    // Use the centralized disconnect function
    await disconnectPrisma();
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
    
    // Use the centralized disconnect function
    await disconnectPrisma();
    process.exit(0);
});

export { app, prisma };
