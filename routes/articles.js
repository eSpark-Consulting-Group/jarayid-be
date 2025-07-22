import express from 'express';
import ArticleController from '../controllers/articleController.js';
import { auth, adminAuth, validate, upload, extractClientInfo } from '../middleware/index.js';
import schemas from '../schemas/index.js';

const router = express.Router();
const articleController = new ArticleController();
const validation = validate(schemas);
const { singleUpload } = upload;

/**
 * @swagger
 * /articles:
 *   post:
 *     summary: Create new article (Admin only)
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ArticleCreate'
 *     responses:
 *       201:
 *         description: Article created successfully
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
 *                   example: "Article created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     article:
 *                       $ref: '#/components/schemas/Article'
 *       400:
 *         description: Bad request
 *       409:
 *         description: Article with URL already exists
 *       500:
 *         description: Internal server error
 */
router.post('/', auth, adminAuth, singleUpload('image'), validation.article.create, articleController.createArticle);

/**
 * @swagger
 * /articles:
 *   get:
 *     summary: Get all articles with pagination and filtering
 *     tags: [Articles]
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
 *         description: Number of articles per page
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by category ID
 *       - in: query
 *         name: pinned
 *         schema:
 *           type: boolean
 *         description: Filter by pinned status
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Search in title, source, and summaries
 *       - in: query
 *         name: trackViews
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Enable view tracking for articles in the list (optional)
 *     responses:
 *       200:
 *         description: Articles retrieved successfully
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
 *                   example: "Articles retrieved successfully"
 *                 data:
 *                   $ref: '#/components/schemas/PaginatedArticles'
 *       500:
 *         description: Internal server error
 */
router.get('/', extractClientInfo, validation.article.query, articleController.getAllArticles);

/**
 * @swagger
 * /articles/stats:
 *   get:
 *     summary: Get article statistics (Admin only)
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Article statistics retrieved successfully
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
 *                   example: "Article statistics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                       example: 150
 *                     pinned:
 *                       type: number
 *                       example: 5
 *                     totalViews:
 *                       type: number
 *                       example: 25000
 *                     averageViews:
 *                       type: number
 *                       example: 167
 *                     topCategories:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                           count:
 *                             type: number
 *       500:
 *         description: Internal server error
 */
router.get('/stats', auth, adminAuth, articleController.getArticleStats);

/**
 * @swagger
 * /articles/trending:
 *   get:
 *     summary: Get trending articles based on recent views
 *     tags: [Articles]
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [1d, 7d, 30d]
 *           default: 7d
 *         description: Time period to consider for trending
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
 *           maximum: 50
 *           default: 10
 *         description: Number of articles per page
 *     responses:
 *       200:
 *         description: Trending articles retrieved successfully
 */
router.get('/trending', articleController.getTrendingArticles);

/**
 * @swagger
 * /articles/analytics/views:
 *   get:
 *     summary: Get comprehensive view analytics dashboard data (Admin only)
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, 1y, all]
 *           default: 30d
 *         description: Time period for analytics
 *     responses:
 *       200:
 *         description: View analytics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/analytics/views', auth, adminAuth, articleController.getViewAnalytics);

/**
 * @swagger
 * /articles/{id}:
 *   get:
 *     summary: Get article by ID
 *     tags: [Articles]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Article ID
 *     responses:
 *       200:
 *         description: Article retrieved successfully
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
 *                   example: "Article retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     article:
 *                       allOf:
 *                         - $ref: '#/components/schemas/Article'
 *                         - type: object
 *                           properties:
 *                             comments:
 *                               type: array
 *                               items:
 *                                 $ref: '#/components/schemas/Comment'
 *       404:
 *         description: Article not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', extractClientInfo, validation.article.params, articleController.getArticleById);

/**
 * @swagger
 * /articles/{id}:
 *   put:
 *     summary: Update article (Admin only)
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Article ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             $ref: '#/components/schemas/ArticleUpdate'
 *     responses:
 *       200:
 *         description: Article updated successfully
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
 *                   example: "Article updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     article:
 *                       $ref: '#/components/schemas/Article'
 *       400:
 *         description: Bad request
 *       404:
 *         description: Article not found
 *       409:
 *         description: Article with URL already exists
 *       500:
 *         description: Internal server error
 */
router.put('/:id', auth, adminAuth, singleUpload('image'), validation.article.params, validation.article.update, articleController.updateArticle);

/**
 * @swagger
 * /articles/{id}:
 *   delete:
 *     summary: Delete article (Admin only)
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Article ID
 *     responses:
 *       200:
 *         description: Article deleted successfully
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
 *                   example: "Article deleted successfully"
 *       404:
 *         description: Article not found
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', auth, adminAuth, validation.article.params, articleController.deleteArticle);

/**
 * @swagger
 * /articles/{id}/pin:
 *   patch:
 *     summary: Toggle pin status of article (Admin only)
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Article ID
 *     responses:
 *       200:
 *         description: Article pin status toggled successfully
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
 *                   example: "Article pinned successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     article:
 *                       $ref: '#/components/schemas/Article'
 *       404:
 *         description: Article not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id/pin', auth, adminAuth, validation.article.params, articleController.togglePinArticle);

/**
 * @swagger
 * /articles/{id}/views:
 *   get:
 *     summary: Get detailed view statistics for an article (Admin only)
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Article ID
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [1d, 7d, 30d, 90d, 1y, all]
 *           default: 30d
 *         description: Time period for statistics
 *     responses:
 *       200:
 *         description: Article view statistics retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Article not found
 */
router.get('/:id/views', auth, adminAuth, validation.article.params, articleController.getArticleViewStats);

export default router;
