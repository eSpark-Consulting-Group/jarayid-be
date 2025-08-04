import { Router } from "express";

import { StaticPageController } from "../controllers/index.js";
import schemas from "../schemas/index.js";
import createValidationMiddleware from "../middleware/validate.js";
import { auth, adminAuth } from "../middleware/index.js";

const router = Router();
const staticPageController = new StaticPageController();
const validation = createValidationMiddleware(schemas);

/**
 * @swagger
 * /static-pages:
 *   post:
 *     summary: Create a new static page (Admin only)
 *     tags: [StaticPages]
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
 *               - slug
 *               - content
 *             properties:
 *               title:
 *                 type: string
 *                 example: Privacy Policy
 *               slug:
 *                 type: string
 *                 example: privacy-policy
 *               content:
 *                 type: json
 *                 example: {"welcomeMessage": "Welcome to our company..."}
 *     responses:
 *       201:
 *         description: Static Page created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Static page created successfully
 *                 data:
 *                   $ref: '#/components/schemas/StaticPage'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 */


// POST /static-pages (Admin only)
router.post(
  "/",
  auth,
  adminAuth,
  validation.staticPage.create,
  staticPageController.createStaticPage
);


/**
 * @swagger
 * /static-pages:
 *   get:
 *     summary: Get all static pages with optional filters
 *     tags: [StaticPages]
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title or slug
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Static pages retrieved successfully
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
 *                   example: Static pages fetched successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/StaticPage'
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 25
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         totalPages:
 *                           type: integer
 *                           example: 3
 *                         hasNextPage:
 *                           type: boolean
 *                           example: true
 *                         hasPrevPage:
 *                           type: boolean
 *                           example: false
 *                         nextPage:
 *                           type: integer
 *                           example: 2
 *                         prevPage:
 *                           type: integer
 *                           nullable: true
 *                           example: null
 *                     meta:
 *                       type: object
 *                       properties:
 *                         itemCount:
 *                           type: integer
 *                           example: 10
 *                         totalItems:
 *                           type: integer
 *                           example: 25
 *                         itemsPerPage:
 *                           type: integer
 *                           example: 10
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 *       404:
 *         description: Static page not found
 */


// GET /static-pages (Public)
router.get("/",  validation.staticPage.query, staticPageController.getAllStaticPages);

/**
 * @swagger
 * /static-pages/{id}:
 *   get:
 *     summary: Get a static page by its ID
 *     tags: [StaticPages]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the static page
 *     responses:
 *       200:
 *         description: Static page found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Static page fetched successfully
 *                 data:
 *                   $ref: '#/components/schemas/StaticPage'
 *       400:
 *         description: Invalid ID
 *       404:
 *         description: Static page not found
 *       401:
 *         description: Unauthorized
 */


// GET /static-pages/:id (Public)
router.get(
  "/:id",
  validation.staticPage.params,
  staticPageController.getStaticPageById
);

/**
 * @swagger
 * /static-pages/{id}:
 *   put:
 *     summary: Update a static page by ID (Admin only)
 *     tags: [StaticPages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the static page to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Updated About Us
 *               slug:
 *                 type: string
 *                 example: updated-about-us
 *               content:
 *                 type: json
 *                 example: {"welcomeMessage": "Updated content goes here"}
 *     responses:
 *       200:
 *         description: Static page updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Static page updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/StaticPage'
 *       400:
 *         description: Invalid input or ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admins only
 *       404:
 *         description: Static page not found
 */


// PUT /static-pages/:id (Admin only)
router.put(
  "/:id",
  auth,
  adminAuth,
  validation.staticPage.params,
  validation.staticPage.update,
  staticPageController.updateStaticPage
);

/**
 * @swagger
 * /static-pages/{id}:
 *   delete:
 *     summary: Delete a static page by id (Admin only)
 *     tags: [StaticPages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the static page to delete
 *     responses:
 *       200:
 *         description: Static page deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 message:
 *                   type: string
 *                   example: Static page deleted successfully
 *       400:
 *         description: Invalid id
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admins only
 *       404:
 *         description: Static page not found
 */


// DELETE /static-pages/:id (Admin only)
router.delete(
  "/:id",
  auth,
  adminAuth,
  validation.staticPage.params,
  staticPageController.deleteStaticPage
);

export default router;
