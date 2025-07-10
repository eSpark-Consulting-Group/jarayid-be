import { Router } from 'express';

import schemas from '../schemas/index.js';
import createValidationMiddleware from '../middleware/validate.js';
import { CategoryController } from '../controllers/index.js';
import { auth, adminAuth, singleUpload } from '../middleware/index.js';

const router = Router();
const categoryController = new CategoryController();
const validation = createValidationMiddleware(schemas);

/**
 * @swagger
 * /categories:
 *   post:
 *     summary: Create a new category (Admin only)
 *     tags: [Categories]
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
 *               - type
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 500
 *               type:
 *                 type: string
 *                 enum: [COUNTRY, NORMAL, MEDIA]
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Category logo image file
 *               videoUrl:
 *                 type: string
 *                 format: uri
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *               seoMeta:
 *                 type: string
 *                 description: |
 *                   JSON string containing SEO metadata. Example structure:
 *                   ```json
 *                   {
 *                     "title": "Technology News",
 *                     "description": "Latest technology news and updates", 
 *                     "keywords": ["tech", "technology", "news"],
 *                     "ogImage": "https://example.com/image.jpg",
 *                     "canonicalUrl": "https://example.com/tech"
 *                   }
 *                   ```
 *                 example: '{"title":"Technology News","description":"Latest technology news","keywords":["tech","news"]}'
 *               thresholdDays:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *                 default: 7
 *     responses:
 *       201:
 *         description: Category created successfully
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
 *                   example: "Category created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       409:
 *         description: Category with this name already exists
 *       500:
 *         description: Internal server error
 */
router.post('/', auth, adminAuth, singleUpload('logo'), validation.category.create, categoryController.createCategory);

/**
 * @swagger
 * /categories:
 *   get:
 *     summary: Get all categories with pagination
 *     tags: [Categories]
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
 *         name: type
 *         schema:
 *           type: string
 *           enum: [COUNTRY, NORMAL, MEDIA]
 *         description: Filter by category type
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           minLength: 1
 *           maxLength: 100
 *         description: Search categories by name
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
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
 *                   example: "Categories retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/Category'
 *                           - type: object
 *                             properties:
 *                               _count:
 *                                 type: object
 *                                 properties:
 *                                   articles:
 *                                     type: integer
 *                                   rssFeeds:
 *                                     type: integer
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                         page:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *                         nextPage:
 *                           type: integer
 *                           nullable: true
 *                         prevPage:
 *                           type: integer
 *                           nullable: true
 *                     meta:
 *                       type: object
 *                       properties:
 *                         itemCount:
 *                           type: integer
 *                         totalItems:
 *                           type: integer
 *                         itemsPerPage:
 *                           type: integer
 *                         currentPage:
 *                           type: integer
 *       500:
 *         description: Internal server error
 */
router.get('/', validation.category.query, categoryController.getAllCategories);

/**
 * @swagger
 * /categories/{id}:
 *   get:
 *     summary: Get category by ID
 *     tags: [Categories]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category retrieved successfully
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
 *                   example: "Category retrieved successfully"
 *                 data:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Category'
 *                     - type: object
 *                       properties:
 *                         _count:
 *                           type: object
 *                           properties:
 *                             articles:
 *                               type: integer
 *                             rssFeeds:
 *                               type: integer
 *       400:
 *         description: Invalid category ID
 *       404:
 *         description: Category not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', validation.category.params, categoryController.getCategoryById);

/**
 * @swagger
 * /categories/{id}:
 *   put:
 *     summary: Update category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
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
 *               type:
 *                 type: string
 *                 enum: [COUNTRY, NORMAL, MEDIA]
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Category logo image file
 *               videoUrl:
 *                 type: string
 *                 format: uri
 *               description:
 *                 type: string
 *                 maxLength: 2000
 *               seoMeta:
 *                 type: string
 *                 description: |
 *                   JSON string containing SEO metadata. Example structure:
 *                   ```json
 *                   {
 *                     "title": "Technology News",
 *                     "description": "Latest technology news and updates", 
 *                     "keywords": ["tech", "technology", "news"],
 *                     "ogImage": "https://example.com/image.jpg",
 *                     "canonicalUrl": "https://example.com/tech"
 *                   }
 *                   ```
 *                 example: '{"title":"Updated Technology","description":"Updated tech news","keywords":["tech","update"]}'
 *               thresholdDays:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 365
 *           example:
 *             name: "Updated Technology"
 *             description: "Updated description for technology category"
 *             thresholdDays: 14
 *     responses:
 *       200:
 *         description: Category updated successfully
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
 *                   example: "Category updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Category'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       404:
 *         description: Category not found
 *       409:
 *         description: Category with this name already exists
 *       500:
 *         description: Internal server error
 */
router.put('/:id', auth, adminAuth, singleUpload('logo'), validation.category.params, validation.category.update, categoryController.updateCategory);

/**
 * @swagger
 * /categories/{id}:
 *   delete:
 *     summary: Delete category (Admin only)
 *     tags: [Categories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Category ID
 *     responses:
 *       200:
 *         description: Category deleted successfully
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
 *                   example: "Category deleted successfully"
 *                 data:
 *                   type: null
 *       400:
 *         description: Invalid category ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       404:
 *         description: Category not found
 *       409:
 *         description: Cannot delete category that has associated articles or RSS feeds
 *       500:
 *         description: Internal server error
 */
router.delete('/:id', auth, adminAuth, validation.category.params, categoryController.deleteCategory);

export default router;
