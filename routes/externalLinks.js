import { Router } from "express";

import schemas from "../schemas/index.js";
import createValidationMiddleware from "../middleware/validate.js";
import { ExternalLinkController } from "../controllers/index.js";
import { auth, adminAuth } from "../middleware/index.js";

const router = Router();
const externalLinkController = new ExternalLinkController();
const validation = createValidationMiddleware(schemas);

/**
 * @swagger
 * /external-links:
 *   post:
 *     summary: Create a new external link (Admin only)
 *     tags: [External Links]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExternalLinkCreate'
 *           example:
 *             toolName: "ChatGPT"
 *             toolRedirectLink: "https://chat.openai.com"
 *             status: "ACTIVE"
 *     responses:
 *       201:
 *         description: External link created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin only
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  auth,
  adminAuth,
  validation.externalLink.create,
  externalLinkController.createExternalLink
);

/**
 * @swagger
 * /external-links:
 *   get:
 *     summary: Get all external links with pagination
 *     tags: [External Links]
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
 *         name: search
 *         schema:
 *           type: string
 *           maxLength: 100
 *         description: Filter by tool name or redirect link
 *     responses:
 *       200:
 *         description: External links retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get(
  "/",
  auth,
  adminAuth,
  validation.externalLink.query,
  externalLinkController.getAllExternalLinks
);

/**
 * @swagger
 * /external-links/{id}:
 *   get:
 *     summary: Get external link by ID
 *     tags: [External Links]
 *     security:
 *        - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: External link numeric ID
 *     responses:
 *       200:
 *         description: External link retrieved successfully
 *       400:
 *         description: Invalid external link ID
 *       404:
 *         description: External link not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:id",
  auth,
  adminAuth,
  validation.externalLink.params,
  externalLinkController.getExternalLinkById
);

/**
 * @swagger
 * /external-links/{id}:
 *   put:
 *     summary: Update external link (Admin only)
 *     tags: [External Links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: External link numeric ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ExternalLinkUpdate'
 *           example:
 *             toolName: "Updated ChatGPT"
 *             toolRedirectLink: "https://platform.openai.com"
 *             status: "INACTIVE"
 *     responses:
 *       200:
 *         description: External link updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: External link not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/:id",
  auth,
  adminAuth,
  validation.externalLink.params,
  validation.externalLink.update,
  externalLinkController.updateExternalLink
);

/**
 * @swagger
 * /external-links/{id}:
 *   delete:
 *     summary: Delete external link (Admin only)
 *     tags: [External Links]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: External link numeric ID
 *     responses:
 *       200:
 *         description: External link deleted successfully
 *       400:
 *         description: Invalid external link ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: External link not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/:id",
  auth,
  adminAuth,
  validation.externalLink.params,
  externalLinkController.deleteExternalLink
);

export default router;
