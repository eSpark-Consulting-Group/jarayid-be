import express from 'express';
import AISummaryController from '../controllers/aiSummaryController.js';
import { auth, adminAuth, validate } from '../middleware/index.js';
import schemas from '../schemas/index.js';

const router = express.Router();
const aiSummaryController = AISummaryController;
const validation = validate(schemas);

/**
 * @swagger
 * tags:
 *   name: AI Summary
 *   description: AI-powered bilingual article summarization
 */

/**
 * @swagger
 * /ai-summary/health:
 *   get:
 *     summary: Health check for AI summary service
 *     tags: [AI Summary]
 *     responses:
 *       200:
 *         description: AI Summary service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "AI Summary service is healthy"
 *                 data:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "healthy"
 *                     initialized:
 *                       type: boolean
 *                       example: true
 *                     stats:
 *                       type: object
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *       503:
 *         description: AI Summary service is unavailable
 */
router.get('/health', aiSummaryController.healthCheck);

/**
 * @swagger
 * /ai-summary/stats:
 *   get:
 *     summary: Get AI summary processing statistics
 *     tags: [AI Summary]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: AI summary statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "AI summary statistics retrieved"
 *                 data:
 *                   type: object
 *                   properties:
 *                     articles:
 *                       type: object
 *                       properties:
 *                         totalArticles:
 *                           type: number
 *                           example: 115
 *                         missingEnglish:
 *                           type: number
 *                           example: 8
 *                         missingArabic:
 *                           type: number
 *                           example: 8
 *                         needsProcessing:
 *                           type: number
 *                           example: 8
 *                         completionRate:
 *                           type: number
 *                           example: 93
 *                     queue:
 *                       type: object
 *                       properties:
 *                         waiting:
 *                           type: number
 *                           example: 0
 *                         active:
 *                           type: number
 *                           example: 1
 *                         completed:
 *                           type: number
 *                           example: 5
 *                         failed:
 *                           type: number
 *                           example: 0
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to retrieve statistics
 */
router.get('/stats', auth, aiSummaryController.getProcessingStats);

/**
 * @swagger
 * /ai-summary/jobs:
 *   get:
 *     summary: Get recent AI summary jobs
 *     tags: [AI Summary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [waiting, active, completed, failed, delayed]
 *           default: completed
 *         description: Job status filter
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Number of jobs to return
 *     responses:
 *       200:
 *         description: Recent jobs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Recent jobs retrieved"
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           finishedOn:
 *                             type: string
 *                             format: date-time
 *                           progress:
 *                             type: number
 *                     count:
 *                       type: number
 *                     status:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Failed to retrieve jobs
 */
router.get('/jobs', auth, aiSummaryController.getRecentJobs);

/**
 * @swagger
 * /ai-summary/job/{jobId}:
 *   get:
 *     summary: Get specific job status
 *     tags: [AI Summary]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *         description: Job ID
 *     responses:
 *       200:
 *         description: Job status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Job status retrieved"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     state:
 *                       type: string
 *                       example: "completed"
 *                     progress:
 *                       type: number
 *                       example: 100
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     finishedOn:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Job not found
 *       500:
 *         description: Failed to retrieve job status
 */
router.get('/job/:jobId', auth, aiSummaryController.getJobStatus);

/**
 * @swagger
 * /ai-summary/process:
 *   post:
 *     summary: Manually trigger AI summary processing (Admin only)
 *     tags: [AI Summary]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               batchSize:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 20
 *                 default: 5
 *                 description: Number of articles to process in each batch
 *               maxRetries:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 default: 3
 *                 description: Maximum retry attempts for failed articles
 *               forceRegenerate:
 *                 type: boolean
 *                 default: false
 *                 description: Force regenerate existing summaries
 *     responses:
 *       202:
 *         description: AI summary processing started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "AI summary processing started"
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobId:
 *                       type: string
 *                       example: "123"
 *                     stats:
 *                       type: object
 *                     estimatedDuration:
 *                       type: string
 *                       example: "2 minutes"
 *       200:
 *         description: No articles need processing
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       503:
 *         description: AI Summary service not available
 *       500:
 *         description: Failed to start processing
 */
router.post('/process', auth, adminAuth, aiSummaryController.processArticleSummaries);

/**
 * @swagger
 * /ai-summary/articles:
 *   post:
 *     summary: Process summaries for specific articles (Admin only)
 *     tags: [AI Summary]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - articleIds
 *             properties:
 *               articleIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 100
 *                 description: Array of article IDs to process
 *               batchSize:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 20
 *                 default: 5
 *                 description: Number of articles to process in each batch
 *               maxRetries:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 5
 *                 default: 3
 *                 description: Maximum retry attempts for failed articles
 *     responses:
 *       202:
 *         description: Specific article processing started
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "AI summary processing started for 5 articles"
 *                 data:
 *                   type: object
 *                   properties:
 *                     jobId:
 *                       type: string
 *                       example: "124"
 *                     articleCount:
 *                       type: number
 *                       example: 5
 *                     estimatedDuration:
 *                       type: string
 *                       example: "1 minutes"
 *       400:
 *         description: Invalid article IDs or too many articles
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       500:
 *         description: Failed to start processing
 */
router.post('/articles', auth, adminAuth, aiSummaryController.processSpecificArticles);

export default router;
