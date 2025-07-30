import { Router } from 'express';

import schemas from '../schemas/index.js';
import createValidationMiddleware from '../middleware/validate.js';
import { CookieController } from '../controllers/index.js';
import { auth, adminAuth } from '../middleware/index.js';

const router = Router();
const cookieController = new CookieController();
const validation = createValidationMiddleware(schemas);

// Public routes (no authentication required)
/**
 * @swagger
 * /api/cookies/public:
 *   get:
 *     summary: Get all enabled cookies for public display (cookie consent banner)
 *     tags: [Cookies]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [ESSENTIAL, FUNCTIONAL, ANALYTICS, MARKETING, PREFERENCES]
 *         description: Filter by cookie category
 *     responses:
 *       200:
 *         description: List of enabled cookies
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
 *                     cookies:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Cookie'
 *                     total:
 *                       type: integer
 *                     categories:
 *                       type: object
 *       500:
 *         description: Server error
 */
router.get('/public', cookieController.getPublicCookies);

// Admin routes (authentication + admin role required)
/**
 * @swagger
 * /api/cookies:
 *   post:
 *     summary: Create a new cookie (Admin only)
 *     tags: [Cookies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - purpose
 *               - duration
 *             properties:
 *               name:
 *                 type: string
 *                 pattern: '^[a-zA-Z0-9_-]+$'
 *                 minLength: 2
 *                 maxLength: 100
 *               purpose:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *               duration:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *               category:
 *                 type: string
 *                 enum: [ESSENTIAL, FUNCTIONAL, ANALYTICS, MARKETING, PREFERENCES]
 *                 default: FUNCTIONAL
 *               isEssential:
 *                 type: boolean
 *                 default: false
 *               isEnabled:
 *                 type: boolean
 *                 default: true
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       201:
 *         description: Cookie created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       409:
 *         description: Cookie with this name already exists
 *       500:
 *         description: Server error
 */
router.post('/',
    auth,
    adminAuth,
    validation.cookie.create,
    cookieController.createCookie
);

/**
 * @swagger
 * /api/cookies:
 *   get:
 *     summary: Get all cookies with filtering and pagination (Admin only)
 *     tags: [Cookies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [ESSENTIAL, FUNCTIONAL, ANALYTICS, MARKETING, PREFERENCES]
 *       - in: query
 *         name: isEssential
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: isEnabled
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 255
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [name, purpose, category, duration, createdAt, updatedAt]
 *           default: createdAt
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *     responses:
 *       200:
 *         description: List of cookies with pagination
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get('/',
    auth,
    adminAuth,
    validation.cookie.query,
    cookieController.getAllCookies
);

/**
 * @swagger
 * /api/cookies/stats:
 *   get:
 *     summary: Get cookie statistics (Admin only)
 *     tags: [Cookies]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cookie statistics
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
 *                     total:
 *                       type: integer
 *                     enabled:
 *                       type: integer
 *                     disabled:
 *                       type: integer
 *                     essential:
 *                       type: integer
 *                     byCategory:
 *                       type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Server error
 */
router.get('/stats',
    auth,
    adminAuth,
    cookieController.getCookieStats
);

/**
 * @swagger
 * /api/cookies/{id}:
 *   get:
 *     summary: Get a specific cookie by ID (Admin only)
 *     tags: [Cookies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Cookie details
 *       400:
 *         description: Invalid cookie ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Cookie not found
 *       500:
 *         description: Server error
 */
router.get('/:id',
    auth,
    adminAuth,
    validation.cookie.params,
    cookieController.getCookieById
);

/**
 * @swagger
 * /api/cookies/{id}:
 *   put:
 *     summary: Update a specific cookie (Admin only)
 *     tags: [Cookies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             minProperties: 1
 *             properties:
 *               name:
 *                 type: string
 *                 pattern: '^[a-zA-Z0-9_-]+$'
 *                 minLength: 2
 *                 maxLength: 100
 *               purpose:
 *                 type: string
 *                 minLength: 10
 *                 maxLength: 500
 *               duration:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 50
 *               category:
 *                 type: string
 *                 enum: [ESSENTIAL, FUNCTIONAL, ANALYTICS, MARKETING, PREFERENCES]
 *               isEssential:
 *                 type: boolean
 *               isEnabled:
 *                 type: boolean
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       200:
 *         description: Cookie updated successfully
 *       400:
 *         description: Validation error or invalid cookie ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Cookie not found
 *       409:
 *         description: Cookie name already exists
 *       500:
 *         description: Server error
 */
router.put('/:id',
    auth,
    adminAuth,
    validation.cookie.params,
    validation.cookie.update,
    cookieController.updateCookie
);

/**
 * @swagger
 * /api/cookies/{id}:
 *   delete:
 *     summary: Delete a specific cookie (Admin only)
 *     tags: [Cookies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Cookie deleted successfully
 *       400:
 *         description: Invalid cookie ID or cannot delete essential cookie
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Cookie not found
 *       500:
 *         description: Server error
 */
router.delete('/:id',
    auth,
    adminAuth,
    validation.cookie.params,
    cookieController.deleteCookie
);

/**
 * @swagger
 * /api/cookies/{id}/toggle:
 *   patch:
 *     summary: Toggle cookie enabled/disabled status (Admin only)
 *     tags: [Cookies]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Cookie status toggled successfully
 *       400:
 *         description: Invalid cookie ID or cannot disable essential cookie
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Cookie not found
 *       500:
 *         description: Server error
 */
router.patch('/:id/toggle',
    auth,
    adminAuth,
    validation.cookie.params,
    cookieController.toggleCookieStatus
);

/**
 * @swagger
 * /api/cookies/bulk-update:
 *   patch:
 *     summary: Bulk update multiple cookies (Admin only)
 *     tags: [Cookies]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - cookieIds
 *               - updates
 *             properties:
 *               cookieIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 50
 *               updates:
 *                 type: object
 *                 minProperties: 1
 *                 properties:
 *                   category:
 *                     type: string
 *                     enum: [ESSENTIAL, FUNCTIONAL, ANALYTICS, MARKETING, PREFERENCES]
 *                   isEnabled:
 *                     type: boolean
 *                   purpose:
 *                     type: string
 *                     minLength: 10
 *                     maxLength: 500
 *                   duration:
 *                     type: string
 *                     minLength: 1
 *                     maxLength: 50
 *                   description:
 *                     type: string
 *                     maxLength: 1000
 *     responses:
 *       200:
 *         description: Cookies updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: Some cookies not found
 *       500:
 *         description: Server error
 */
router.patch('/bulk-update',
    auth,
    adminAuth,
    validation.cookie.bulkUpdate,
    cookieController.bulkUpdateCookies
);

export default router;
