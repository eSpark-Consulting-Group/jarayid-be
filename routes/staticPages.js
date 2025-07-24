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
 *                 example: About Us
 *               slug:
 *                 type: string
 *                 example: about-us
 *               content:
 *                 type: string
 *                 example: Welcome to our company...
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
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title or slug
 *       - in: query
 *         name: sort_by
 *         schema:
 *           type: string
 *           enum: [title, created_at]
 *         description: Field to sort by
 *       - in: query
 *         name: sort_order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort order
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
 *         description: List of static pages
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
 *                   example: Static pages fetched successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/StaticPage'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total_pages:
 *                       type: integer
 *                     current_page:
 *                       type: integer
 *                     total_records:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 */


// GET /static-pages (Public)
router.get("/", auth, validation.staticPage.query, staticPageController.getAllStaticPages);

/**
 * @swagger
 * /static-pages/{slug}:
 *   get:
 *     summary: Get a static page by its slug
 *     tags: [StaticPages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug of the static page
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
 *         description: Invalid slug
 *       404:
 *         description: Static page not found
 *       401:
 *         description: Unauthorized
 */


// GET /static-pages/:id (Public)
router.get(
  "/:id",
  auth,
  validation.staticPage.params,
  staticPageController.getStaticPageBySlug
);

/**
 * @swagger
 * /static-pages/{slug}:
 *   put:
 *     summary: Update a static page by slug (Admin only)
 *     tags: [StaticPages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug of the static page to update
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
 *                 type: string
 *                 example: Updated content goes here
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
 *         description: Invalid input or slug
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
 * /static-pages/{slug}:
 *   delete:
 *     summary: Delete a static page by slug (Admin only)
 *     tags: [StaticPages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Slug of the static page to delete
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
 *         description: Invalid slug
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
