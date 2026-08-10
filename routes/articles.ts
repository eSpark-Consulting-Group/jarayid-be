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
 *     summary: Get all articles with pagination, filtering, and sorting
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
 *           maximum: 200
 *           default: 10
 *         description: Number of articles per page
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by category ID
 *       - in: query
 *         name: subType
 *         schema:
 *           type: string
 *           enum: [SPORTS, ECONOMICS, POLITICS]
 *         description: Filter by article sub-type
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
 *         name: status
 *         schema:
 *           type: boolean
 *         description: Filter by article status (true for active, false for inactive)
 *       - in: query
 *         name: trackViews
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Enable view tracking for articles in the list (optional)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [title, publishedAt, createdAt, viewCount, source, pinned]
 *           default: publishedAt
 *         description: Field to sort by
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order (ascending or descending)
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter articles published from this date (ISO 8601 format)
 *         example: "2024-01-01"
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter articles published until this date (ISO 8601 format)
 *         example: "2024-12-31"
 *       - in: query
 *         name: createdFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter articles created from this date (ISO 8601 format)
 *         example: "2024-01-01"
 *       - in: query
 *         name: createdTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter articles created until this date (ISO 8601 format)
 *         example: "2024-12-31"
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
 * /articles/delete/bulk-delete:
 *   delete:
 *     summary: Delete multiple articles in bulk (Admin only)
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               articleIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 100
 *                 uniqueItems: true
 *                 description: Array of article IDs to delete
 *                 example: ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"]
 *             required:
 *               - articleIds
 *     responses:
 *       200:
 *         description: Articles deleted successfully
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
 *                   example: "Successfully deleted 5 article(s)"
 *                 data:
 *                   type: object
 *                   properties:
 *                     deletedCount:
 *                       type: integer
 *                       example: 5
 *                       description: Number of articles successfully deleted
 *                     notFoundIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: []
 *                       description: Array of article IDs that were not found
 *                     deletedArticles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           title:
 *                             type: string
 *                       description: Information about deleted articles
 *       400:
 *         description: Bad request (invalid article IDs array)
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: No articles found with provided IDs
 *       500:
 *         description: Internal server error
 */
router.delete('/delete/bulk-delete', auth, adminAuth, validation.article.bulkDelete, articleController.deleteMultipleArticles);

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

/**
 * @swagger
 * /articles/{id}/toggle-favorite:
 *   post:
 *     summary: Toggle favorite status for an article
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
 *     responses:
 *       200:
 *         description: Favorite status toggled successfully
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
 *                   example: "Article added to favorites"
 *                 data:
 *                   type: object
 *                   properties:
 *                     isFavorited:
 *                       type: boolean
 *                       example: true
 *                     article:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Article not found
 */
router.post('/:id/toggle-favorite', auth, validation.article.params, articleController.toggleFavorite);

/**
 * @swagger
 * /articles/{id}/toggle-read-later:
 *   post:
 *     summary: Toggle read later status for an article
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
 *     responses:
 *       200:
 *         description: Read later status toggled successfully
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
 *                   example: "Article added to read later"
 *                 data:
 *                   type: object
 *                   properties:
 *                     isInReadLater:
 *                       type: boolean
 *                       example: true
 *                     article:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Article not found
 */
router.post('/:id/toggle-read-later', auth, validation.article.params, articleController.toggleReadLater);

/**
 * @swagger
 * /articles/user/favorites:
 *   get:
 *     summary: Get user's favorite articles
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Favorite articles retrieved successfully
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
 *                   example: "Favorite articles retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/Article'
 *                           - type: object
 *                             properties:
 *                               favoritedAt:
 *                                 type: string
 *                                 format: date-time
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                     meta:
 *                       type: object
 *                       properties:
 *                         totalFavorites:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/user/favorites', auth, validation.article.query, articleController.getUserFavorites);

/**
 * @swagger
 * /articles/feeds/read-later:
 *   get:
 *     summary: Get user's read later articles
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 100
 *         description: Items per page
 *     responses:
 *       200:
 *         description: Read later articles retrieved successfully
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
 *                   example: "Read later articles retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/Article'
 *                           - type: object
 *                             properties:
 *                               addedToReadLaterAt:
 *                                 type: string
 *                                 format: date-time
 *                               updatedAt:
 *                                 type: string
 *                                 format: date-time
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                     meta:
 *                       type: object
 *                       properties:
 *                         totalReadLater:
 *                           type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/feeds/read-later', auth, validation.article.query, articleController.getUserReadLater);

/**
 * @swagger
 * /articles/admin/favorites-stats:
 *   get:
 *     summary: Get favorites statistics (Admin only)
 *     tags: [Articles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           maximum: 50
 *         description: Number of top articles to return
 *     responses:
 *       200:
 *         description: Favorites statistics retrieved successfully
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
 *                   example: "Favorites statistics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalFavorites:
 *                           type: integer
 *                           example: 1250
 *                         totalUsers:
 *                           type: integer
 *                           example: 500
 *                         totalArticles:
 *                           type: integer
 *                           example: 300
 *                         favoritesRate:
 *                           type: string
 *                           example: "4.17"
 *                     mostFavorited:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           article:
 *                             $ref: '#/components/schemas/Article'
 *                           favoriteCount:
 *                             type: integer
 *                             example: 45
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 */
router.get('/admin/favorites-stats', auth, adminAuth, articleController.getFavoritesStats);

export default router;
