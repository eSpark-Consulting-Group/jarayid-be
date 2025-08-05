import express from 'express';
import youtubeContentController from '../controllers/youtubeContentController.js';
import { auth, adminAuth, validate } from '../middleware/index.js';
import schemas from '../schemas/index.js';

const router = express.Router();
const validation = validate(schemas);

/**
 * @swagger
 * tags:
 *   name: YouTube Content
 *   description: YouTube content management (Shorts and Full Videos)
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     YouTubeContent:
 *       type: object
 *       required:
 *         - title
 *         - youtubeUrl
 *         - contentType
 *         - categoryId
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier
 *         title:
 *           type: string
 *           maxLength: 500
 *           description: Title of the YouTube content
 *         youtubeUrl:
 *           type: string
 *           format: uri
 *           description: YouTube video URL
 *         contentType:
 *           type: string
 *           enum: [SHORTS, FULL_VIDEO]
 *           description: Type of YouTube content
 *         categoryId:
 *           type: string
 *           format: uuid
 *           description: Associated category ID
 *         isEnabled:
 *           type: boolean
 *           default: true
 *           description: Whether content is enabled
 *         viewCount:
 *           type: integer
 *           default: 0
 *           description: Number of views
 *         description:
 *           type: string
 *           maxLength: 2000
 *           description: Content description
 *         thumbnailUrl:
 *           type: string
 *           format: uri
 *           description: Thumbnail image URL
 *         deviceType:
 *           type: string
 *           enum: [WEB, MOBILE, BOTH]
 *           description: Target device type
 *         duration:
 *           type: string
 *           pattern: '^\\d{1,2}:\\d{2}(:\\d{2})?$'
 *           description: Video duration (MM:SS or HH:MM:SS)
 *         createdById:
 *           type: string
 *           format: uuid
 *           description: Creator user ID
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *         category:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *             type:
 *               type: string
 *               enum: [COUNTRY, NORMAL, MEDIA]
 *         createdBy:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: object
 *             email:
 *               type: string
 *               format: email
 */

/**
 * @swagger
 * /youtube-content:
 *   post:
 *     summary: Create new YouTube content
 *     tags: [YouTube Content]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - youtubeUrl
 *               - contentType
 *               - categoryId
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 500
 *                 example: "Amazing YouTube Short about Technology"
 *               youtubeUrl:
 *                 type: string
 *                 format: uri
 *                 pattern: '^https?://(www\.)?(youtube\.com/watch\?v=|youtu\.be/|youtube\.com/shorts/)'
 *                 example: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
 *               contentType:
 *                 type: string
 *                 enum: [SHORTS, FULL_VIDEO]
 *                 example: "SHORTS"
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *                 example: "550e8400-e29b-41d4-a716-446655440000"
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *                 example: "This is an amazing technology short that explains..."
 *               thumbnailUrl:
 *                 type: string
 *                 format: uri
 *                 example: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg"
 *               deviceType:
 *                 type: string
 *                 enum: [WEB, MOBILE, BOTH]
 *                 example: "BOTH"
 *               duration:
 *                 type: string
 *                 pattern: '^\\d{1,2}:\\d{2}(:\\d{2})?$'
 *                 example: "0:45"
 *               isEnabled:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: YouTube content created successfully
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
 *                   example: "YouTube content created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/YouTubeContent'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Category not found
 *       409:
 *         description: YouTube URL already exists
 *       500:
 *         description: Internal server error
 */
router.post('/', auth, validation.youtubeContent.create, youtubeContentController.create);

/**
 * @swagger
 * /youtube-content:
 *   get:
 *     summary: Get all YouTube content with filtering and pagination
 *     tags: [YouTube Content]
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
 *           maximum: 200
 *           default: 20
 *         description: Number of items per page
 *       - in: query
 *         name: contentType
 *         schema:
 *           type: string
 *           enum: [SHORTS, FULL_VIDEO]
 *         description: Filter by content type
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by category ID
 *       - in: query
 *         name: isEnabled
 *         schema:
 *           type: boolean
 *         description: Filter by enabled status
 *       - in: query
 *         name: deviceType
 *         schema:
 *           type: string
 *           enum: [WEB, MOBILE, BOTH]
 *         description: Filter by device type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           minLength: 2
 *           maxLength: 100
 *         description: Search in title and description
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, title, viewCount]
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
 *         description: YouTube content list retrieved successfully
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
 *                   example: "YouTube contents retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     contents:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/YouTubeContent'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         hasNext:
 *                           type: boolean
 *                         hasPrev:
 *                           type: boolean
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/',  validation.youtubeContent.query, youtubeContentController.getAll);

/**
 * @swagger
 * /youtube-content/stats:
 *   get:
 *     summary: Get YouTube content statistics
 *     tags: [YouTube Content]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
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
 *                   example: "YouTube content statistics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalContent:
 *                           type: integer
 *                         totalShorts:
 *                           type: integer
 *                         totalFullVideos:
 *                           type: integer
 *                         enabledContent:
 *                           type: integer
 *                         disabledContent:
 *                           type: integer
 *                         enabledPercentage:
 *                           type: integer
 *                     byCategory:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           categoryId:
 *                             type: string
 *                           _count:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                     topViewed:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           viewCount:
 *                             type: integer
 *                           contentType:
 *                             type: string
 *                     recent:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                           contentType:
 *                             type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/stats', auth, youtubeContentController.getStats);

/**
 * @swagger
 * /youtube-content/{id}:
 *   get:
 *     summary: Get single YouTube content by ID
 *     tags: [YouTube Content]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: YouTube content ID
 *     responses:
 *       200:
 *         description: YouTube content retrieved successfully
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
 *                   example: "YouTube content retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/YouTubeContent'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: YouTube content not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', validation.youtubeContent.params, youtubeContentController.getById);

/**
 * @swagger
 * /youtube-content/{id}:
 *   put:
 *     summary: Update YouTube content
 *     tags: [YouTube Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: YouTube content ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 500
 *               youtubeUrl:
 *                 type: string
 *                 format: uri
 *               contentType:
 *                 type: string
 *                 enum: [SHORTS, FULL_VIDEO]
 *               categoryId:
 *                 type: string
 *                 format: uuid
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *               thumbnailUrl:
 *                 type: string
 *                 format: uri
 *               deviceType:
 *                 type: string
 *                 enum: [WEB, MOBILE, BOTH]
 *               duration:
 *                 type: string
 *                 pattern: '^\\d{1,2}:\\d{2}(:\\d{2})?$'
 *               isEnabled:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: YouTube content updated successfully
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
 *                   example: "YouTube content updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/YouTubeContent'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (not owner or admin)
 *       404:
 *         description: YouTube content not found
 *       409:
 *         description: YouTube URL already exists
 *       500:
 *         description: Internal server error
 */
router.put('/:id', auth, validation.youtubeContent.params, validation.youtubeContent.update, youtubeContentController.update);

/**
 * @swagger
 * /youtube-content/{id}/toggle-status:
 *   patch:
 *     summary: Toggle YouTube content status (enable/disable)
 *     tags: [YouTube Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: YouTube content ID
 *     responses:
 *       200:
 *         description: Status toggled successfully
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
 *                   example: "YouTube content enabled successfully"
 *                 data:
 *                   $ref: '#/components/schemas/YouTubeContent'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (not owner or admin)
 *       404:
 *         description: YouTube content not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/toggle-status', auth, validation.youtubeContent.params, youtubeContentController.toggleStatus);

/**
 * @swagger
 * /youtube-content/{id}:
 *   delete:
 *     summary: Delete YouTube content
 *     tags: [YouTube Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: YouTube content ID
 *     responses:
 *       200:
 *         description: YouTube content deleted successfully
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
 *                   example: "YouTube content deleted successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (not owner or admin)
 *       404:
 *         description: YouTube content not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', auth, validation.youtubeContent.params, youtubeContentController.delete);

/**
 * @swagger
 * /youtube-content/{id}/refresh-thumbnail:
 *   patch:
 *     summary: Refresh thumbnail for YouTube content
 *     tags: [YouTube Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: YouTube content ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               quality:
 *                 type: string
 *                 enum: [default, mqdefault, hqdefault, sddefault, maxresdefault]
 *                 default: hqdefault
 *                 description: Thumbnail quality to use
 *     responses:
 *       200:
 *         description: Thumbnail refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *       400:
 *         description: Invalid YouTube URL
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied (not owner or admin)
 *       404:
 *         description: YouTube content not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/refresh-thumbnail', auth, validation.youtubeContent.params, validation.youtubeContent.refreshThumbnail, youtubeContentController.refreshThumbnail);

/**
 * @swagger
 * /youtube-content/{id}/thumbnails:
 *   get:
 *     summary: Get thumbnail alternatives for YouTube content
 *     tags: [YouTube Content]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: YouTube content ID
 *     responses:
 *       200:
 *         description: Thumbnail alternatives retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     contentId:
 *                       type: string
 *                     contentTitle:
 *                       type: string
 *                     contentType:
 *                       type: string
 *                     currentThumbnail:
 *                       type: string
 *                     videoId:
 *                       type: string
 *                     isShorts:
 *                       type: boolean
 *                     thumbnailAlternatives:
 *                       type: object
 *                       properties:
 *                         default:
 *                           type: string
 *                         medium:
 *                           type: string
 *                         high:
 *                           type: string
 *                         standard:
 *                           type: string
 *                         maxres:
 *                           type: string
 *       400:
 *         description: Invalid YouTube URL
 *       404:
 *         description: YouTube content not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id/thumbnails', auth, validation.youtubeContent.params, youtubeContentController.getThumbnails);

/**
 * @swagger
 * /youtube-content/bulk-refresh-thumbnails:
 *   post:
 *     summary: Bulk refresh thumbnails for multiple YouTube contents
 *     tags: [YouTube Content]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               contentIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 description: Array of content IDs to refresh (optional, if not provided all user's content will be processed)
 *               quality:
 *                 type: string
 *                 enum: [default, mqdefault, hqdefault, sddefault, maxresdefault]
 *                 default: hqdefault
 *                 description: Thumbnail quality to use
 *               onlyEmpty:
 *                 type: boolean
 *                 default: false
 *                 description: Only refresh content that doesn't have a thumbnail
 *     responses:
 *       200:
 *         description: Bulk refresh completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         updated:
 *                           type: integer
 *                         skipped:
 *                           type: integer
 *                     results:
 *                       type: array
 *                       items:
 *                         type: object
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.post('/bulk-refresh-thumbnails', auth, validation.youtubeContent.bulkRefreshThumbnails, youtubeContentController.bulkRefreshThumbnails);

export default router;
