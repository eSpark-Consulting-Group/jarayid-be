import { Router } from 'express';

import schemas from '../schemas/index.js';
import createValidationMiddleware from '../middleware/validate.js';
import { RSSFeedController } from '../controllers/index.js';
import { auth, adminAuth, singleUpload } from '../middleware/index.js';

const router = Router();
const rssFeedController = new RSSFeedController();
const validation = createValidationMiddleware(schemas);

/**
 * @swagger
 * /rss-feeds:
 *   post:
 *     summary: Create a new RSS feed (Admin only)
 *     tags: [RSS Feeds]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - url
 *               - categoryId
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 500
 *                 description: RSS feed name
 *                 example: "TechCrunch Feed"
 *               url:
 *                 type: string
 *                 format: uri
 *                 maxLength: 500
 *                 description: RSS feed URL
 *                 example: "https://example.com/rss.xml"
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 description: Category ID for this RSS feed
 *               subType:
 *                 type: string
 *                 enum: [SPORTS, ECONOMICS, POLITICS]
 *                 description: RSS feed sub-type for categorization
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISH, ARCHIVE]
 *                 default: DRAFT
 *                 description: RSS feed status
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: RSS feed logo image file
 *           example:
 *             name: "TechCrunch Technology Feed"
 *             url: "https://techcrunch.com/feed/"
 *             categoryId: "550e8400-e29b-41d4-a716-446655440000"
 *             subType: "ECONOMICS"
 *             status: "PUBLISH"
 *     responses:
 *       201:
 *         description: RSS Feed created successfully
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
 *                   example: "RSS Feed created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     rssFeed:
 *                       $ref: '#/components/schemas/RSSFeed'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       404:
 *         description: Category not found
 *       409:
 *         description: RSS Feed with this name/URL already exists
 *       500:
 *         description: Internal server error
 */
router.post('/', auth, adminAuth, singleUpload('logo'), validation.rssFeed.create, rssFeedController.createRSSFeed);

/**
 * @swagger
 * /rss-feeds:
 *   get:
 *     summary: Get all RSS feeds with pagination and filtering
 *     tags: [RSS Feeds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PUBLISH, ARCHIVE]
 *         description: Filter by RSS feed status
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category ID(s). Can be a single UUID or comma-separated UUIDs for multiple categories
 *         example: "550e8400-e29b-41d4-a716-446655440000,550e8400-e29b-41d4-a716-446655440001"
 *       - in: query
 *         name: subType
 *         schema:
 *           type: string
 *           enum: [SPORTS, ECONOMICS, POLITICS]
 *         description: Filter by RSS feed sub-type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Search in RSS feed name or URL
 *     responses:
 *       200:
 *         description: RSS Feeds retrieved successfully
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
 *                   example: "RSS Feeds retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/RSSFeed'
 *                     pagination:
 *                       $ref: '#/components/schemas/PaginationInfo'
 *                     meta:
 *                       type: object
 *                       properties:
 *                         totalFeeds:
 *                           type: integer
 *                         currentPage:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/', auth, validation.rssFeed.query, rssFeedController.getAllRSSFeeds);

/**
 * @swagger
 * /rss-feeds/{id}:
 *   get:
 *     summary: Get RSS feed by ID
 *     tags: [RSS Feeds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: RSS feed ID
 *     responses:
 *       200:
 *         description: RSS Feed retrieved successfully
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
 *                   example: "RSS Feed retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     rssFeed:
 *                       $ref: '#/components/schemas/RSSFeed'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: RSS Feed not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', auth, validation.rssFeed.params, rssFeedController.getRSSFeedById);

/**
 * @swagger
 * /rss-feeds/{id}:
 *   put:
 *     summary: Update RSS feed (Admin only)
 *     tags: [RSS Feeds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: RSS feed ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 500
 *                 description: RSS feed name
 *               url:
 *                 type: string
 *                 format: uri
 *                 maxLength: 500
 *                 description: RSS feed URL
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 description: Category ID for this RSS feed
 *               subType:
 *                 type: string
 *                 enum: [SPORTS, ECONOMICS, POLITICS]
 *                 description: RSS feed sub-type for categorization
 *               status:
 *                 type: string
 *                 enum: [DRAFT, PUBLISH, ARCHIVE]
 *                 description: RSS feed status
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: RSS feed logo image file
 *           example:
 *             name: "Updated TechCrunch Feed"
 *             url: "https://techcrunch.com/feed/"
 *             subType: "SPORTS"
 *             status: "PUBLISH"
 *     responses:
 *       200:
 *         description: RSS Feed updated successfully
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
 *                   example: "RSS Feed updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     rssFeed:
 *                       $ref: '#/components/schemas/RSSFeed'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       404:
 *         description: RSS Feed or Category not found
 *       409:
 *         description: RSS Feed with this name/URL already exists
 *       500:
 *         description: Internal server error
 */
router.put('/:id', auth, adminAuth, singleUpload('logo'), validation.rssFeed.params, validation.rssFeed.update, rssFeedController.updateRSSFeed);

/**
 * @swagger
 * /rss-feeds/{id}:
 *   delete:
 *     summary: Delete RSS feed (Admin only)
 *     tags: [RSS Feeds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: RSS feed ID
 *     responses:
 *       200:
 *         description: RSS Feed deleted successfully
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
 *                   example: "RSS Feed deleted successfully"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       404:
 *         description: RSS Feed not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', auth, adminAuth, validation.rssFeed.params, rssFeedController.deleteRSSFeed);

/**
 * @swagger
 * /rss-feeds/{id}/process:
 *   post:
 *     summary: Process RSS feed and extract articles (Admin only)
 *     tags: [RSS Feeds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: RSS feed ID
 *     responses:
 *       200:
 *         description: RSS Feed processed successfully
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
 *                   example: "RSS Feed processed successfully: 5 articles created, 2 duplicates found"
 *                 data:
 *                   type: object
 *                   properties:
 *                     rssFeed:
 *                       $ref: '#/components/schemas/RSSFeed'
 *                     processingResult:
 *                       type: object
 *                       properties:
 *                         success:
 *                           type: boolean
 *                         processed:
 *                           type: integer
 *                         duplicates:
 *                           type: integer
 *                         errors:
 *                           type: integer
 *       400:
 *         description: RSS Feed must be published
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       404:
 *         description: RSS Feed not found
 *       500:
 *         description: RSS processing failed
 */
router.post('/:id/process', auth, adminAuth, validation.rssFeed.params, rssFeedController.processRSSFeed);

/**
 * @swagger
 * /rss-feeds/process/all:
 *   post:
 *     summary: Process all published RSS feeds (Admin only)
 *     tags: [RSS Feeds]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Batch RSS processing completed
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
 *                   example: "Batch RSS processing completed: 25 articles created from 5/6 feeds"
 *                 data:
 *                   type: object
 *                   properties:
 *                     processingResult:
 *                       type: object
 *                       properties:
 *                         totalFeeds:
 *                           type: integer
 *                         processedFeeds:
 *                           type: integer
 *                         failedFeeds:
 *                           type: integer
 *                         totalArticles:
 *                           type: integer
 *                         totalDuplicates:
 *                           type: integer
 *                         totalErrors:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       500:
 *         description: Batch RSS processing failed
 */
router.post('/process/all', auth, adminAuth, rssFeedController.processAllRSSFeeds);

/**
 * @swagger
 * /rss-feeds/stats/processing:
 *   get:
 *     summary: Get RSS processing statistics (Admin only)
 *     tags: [RSS Feeds]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: RSS processing statistics retrieved successfully
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
 *                   example: "RSS processing statistics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalRSSFeeds:
 *                       type: integer
 *                     publishedRSSFeeds:
 *                       type: integer
 *                     inactiveRSSFeeds:
 *                       type: integer
 *                     totalArticles:
 *                       type: integer
 *                     rssFeedArticles:
 *                       type: integer
 *                     manualArticles:
 *                       type: integer
 *                     recentRSSArticles:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       500:
 *         description: Failed to retrieve statistics
 */
router.get('/stats/processing', auth, adminAuth, rssFeedController.getRSSProcessingStats);

// Queue-based RSS processing routes

/**
 * @swagger
 * /rss-feeds/{id}/queue-process:
 *   post:
 *     summary: Queue RSS feed for background processing (Admin only)
 *     tags: [RSS Feeds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: RSS feed ID
 *     responses:
 *       200:
 *         description: RSS Feed queued for processing
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
 *                   example: "RSS Feed queued for processing (Job ID: 123)"
 *                 data:
 *                   type: object
 *                   properties:
 *                     rssFeed:
 *                       $ref: '#/components/schemas/RSSFeed'
 *                     job:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         status:
 *                           type: string
 *                           example: "queued"
 *                         priority:
 *                           type: integer
 *       400:
 *         description: RSS Feed must be published
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       404:
 *         description: RSS Feed not found
 *       500:
 *         description: Failed to queue RSS processing
 */
router.post('/:id/queue-process', auth, adminAuth, validation.rssFeed.params, rssFeedController.queueProcessRSSFeed);

/**
 * @swagger
 * /rss-feeds/queue-process/all:
 *   post:
 *     summary: Queue all published RSS feeds for background processing (Admin only)
 *     tags: [RSS Feeds]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Batch RSS processing queued
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
 *                   example: "Batch RSS processing queued (Job ID: 456)"
 *                 data:
 *                   type: object
 *                   properties:
 *                     job:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         status:
 *                           type: string
 *                           example: "queued"
 *                         priority:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       500:
 *         description: Failed to queue batch RSS processing
 */
router.post('/queue-process/all', auth, adminAuth, rssFeedController.queueProcessAllRSSFeeds);

/**
 * @swagger
 * /rss-feeds/queue/status:
 *   get:
 *     summary: Get RSS processing queue status (Admin only)
 *     tags: [RSS Feeds]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue status retrieved successfully
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
 *                   example: "RSS queue status retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     queueStats:
 *                       type: object
 *                       properties:
 *                         waiting:
 *                           type: integer
 *                         active:
 *                           type: integer
 *                         completed:
 *                           type: integer
 *                         failed:
 *                           type: integer
 *                         delayed:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                     healthStatus:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: "active"
 *                         redis:
 *                           type: object
 *                           properties:
 *                             connected:
 *                               type: boolean
 *                     recentJobs:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       500:
 *         description: Failed to retrieve queue status
 */
router.get('/queue/status', auth, adminAuth, rssFeedController.getQueueStatus);

/**
 * @swagger
 * /rss-feeds/queue/jobs/{jobId}:
 *   get:
 *     summary: Get specific job status (Admin only)
 *     tags: [RSS Feeds]
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
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       404:
 *         description: Job not found
 *       500:
 *         description: Failed to retrieve job status
 */
router.get('/queue/jobs/:jobId', auth, adminAuth, rssFeedController.getJobStatus);

/**
 * @swagger
 * /rss-feeds/queue/jobs:
 *   get:
 *     summary: Get queue jobs by status (Admin only)
 *     tags: [RSS Feeds]
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
 *           default: 10
 *         description: Number of jobs to return
 *     responses:
 *       200:
 *         description: Queue jobs retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       500:
 *         description: Failed to retrieve queue jobs
 */
router.get('/queue/jobs', auth, adminAuth, rssFeedController.getQueueJobs);

/**
 * @swagger
 * /rss-feeds/queue/pause:
 *   post:
 *     summary: Pause RSS processing queue (Admin only)
 *     tags: [RSS Feeds]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue paused successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       500:
 *         description: Failed to pause queue
 */
router.post('/queue/pause', auth, adminAuth, rssFeedController.pauseQueue);

/**
 * @swagger
 * /rss-feeds/queue/resume:
 *   post:
 *     summary: Resume RSS processing queue (Admin only)
 *     tags: [RSS Feeds]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Queue resumed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       500:
 *         description: Failed to resume queue
 */
router.post('/queue/resume', auth, adminAuth, rssFeedController.resumeQueue);

/**
 * @swagger
 * /rss-feeds/feeds/status:
 *   get:
 *     summary: Get comprehensive RSS feeds status with accurate article counts
 *     description: Returns RSS feeds with their article counts based on direct database relationships for maximum accuracy
 *     tags: [RSS Feeds]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of feeds per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Search by feed name or URL
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [DRAFT, PUBLISH, ARCHIVE]
 *         description: Filter by feed status
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *         description: Filter by category ID(s). Can be a single UUID or comma-separated UUIDs for multiple categories
 *         example: "550e8400-e29b-41d4-a716-446655440000,550e8400-e29b-41d4-a716-446655440001"
 *       - in: query
 *         name: subType
 *         schema:
 *           type: string
 *           enum: [SPORTS, ECONOMICS, POLITICS]
 *         description: Filter by subcategory type
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter feeds created from this date
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter feeds created up to this date
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, status, createdAt, updatedAt]
 *           default: createdAt
 *         description: Sort by field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: RSS feeds status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     feeds:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           name:
 *                             type: string
 *                           url:
 *                             type: string
 *                           status:
 *                             type: string
 *                             enum: [DRAFT, PUBLISH, ARCHIVE]
 *                           categoryId:
 *                             type: string
 *                             format: uuid
 *                           subType:
 *                             type: string
 *                             enum: [SPORTS, ECONOMICS, POLITICS]
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                           category:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                               slug:
 *                                 type: string
 *                           articleStats:
 *                             type: object
 *                             properties:
 *                               total:
 *                                 type: integer
 *                               today:
 *                                 type: integer
 *                               thisWeek:
 *                                 type: integer
 *                               thisMonth:
 *                                 type: integer
 *                           processingStatus:
 *                             type: object
 *                             properties:
 *                               isProcessing:
 *                                 type: boolean
 *                               lastProcessed:
 *                                 type: string
 *                                 format: date-time
 *                           healthScore:
 *                             type: integer
 *                             minimum: 0
 *                             maximum: 100
 *                           healthStatus:
 *                             type: string
 *                             enum: [excellent, good, fair, poor]
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         total:
 *                           type: integer
 *                         pages:
 *                           type: integer
 *                         hasNext:
 *                           type: boolean
 *                         hasPrev:
 *                           type: boolean
 *                     statistics:
 *                       type: object
 *                       properties:
 *                         totalFeeds:
 *                           type: integer
 *                         totalArticles:
 *                           type: integer
 *                         articlesToday:
 *                           type: integer
 *                         articlesThisWeek:
 *                           type: integer
 *                         articlesThisMonth:
 *                           type: integer
 *                         activeFeeds:
 *                           type: integer
 *                         processingFeeds:
 *                           type: integer
 *                         healthDistribution:
 *                           type: object
 *                           properties:
 *                             excellent:
 *                               type: integer
 *                             good:
 *                               type: integer
 *                             fair:
 *                               type: integer
 *                             poor:
 *                               type: integer
 *                         avgHealthScore:
 *                           type: number
 *                     filters:
 *                       type: object
 *                       properties:
 *                         search:
 *                           type: string
 *                         status:
 *                           type: string
 *                         categoryId:
 *                           type: string
 *                         subType:
 *                           type: string
 *                         dateFrom:
 *                           type: string
 *                         dateTo:
 *                           type: string
 *                         sortBy:
 *                           type: string
 *                         sortOrder:
 *                           type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: Invalid query parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/feeds/status', auth, validation.rssFeed.statusQuery, rssFeedController.getFeedsStatus);

export default router;
