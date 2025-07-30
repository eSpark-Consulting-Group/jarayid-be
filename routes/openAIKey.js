import { Router } from "express";

import ApiKeyController from "../controllers/index.js";
import { auth, adminAuth } from "../middleware/index.js";

const router = Router();
const apiKeyController = new ApiKeyController();

/**
 * @swagger
 * /api-key:
 *   get:
 *     summary: Get the current OpenAI API key (Admin only)
 *     tags: [API Key]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API key retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin only
 *       500:
 *         description: Internal server error
 */
router.get("/", auth, adminAuth, apiKeyController.getApiKey);

/**
 * @swagger
 * /api-key:
 *   post:
 *     summary: Save or update the OpenAI API key (Admin only)
 *     tags: [API Key]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - key
 *             properties:
 *               key:
 *                 type: string
 *                 description: OpenAI API key
 *           example:
 *             key: "sk-xxxxxxx"
 *     responses:
 *       201:
 *         description: API key saved successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin only
 *       500:
 *         description: Internal server error
 */
router.post("/", auth, adminAuth, apiKeyController.saveApiKey);

export default router;
