import { Router } from "express";

import schemas from "../schemas/index.js";
import createValidationMiddleware from "../middleware/validate.js";
import { OpenAIKeyController } from "../controllers/index.js";
import { /*auth*/ adminAuth } from "../middleware/index.js";

const router = Router();
const openAIKeyController = new OpenAIKeyController();
const validation = createValidationMiddleware(schemas);

/**
 * @swagger
 * /api-key:
 *   post:
 *     summary: Add a new API key (Admin only)
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiKeyCreate'
 *           example:
 *             key: "sk-yourkey123"
 *     responses:
 *       201:
 *         description: API key added successfully
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
  /*auth*/
  /*adminAuth*/
  validation.apiKey.create,
  openAIKeyController.createApiKey
);

/**
 * @swagger
 * /api-key:
 *   get:
 *     summary: Get all API keys (Admin only)
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: API keys retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin only
 *       500:
 *         description: Internal server error
 */
router.get("/", /*auth*/ /*adminAuth*/ openAIKeyController.getAllApiKeys);

/**
 * @swagger
 * /api-key/{id}:
 *   put:
 *     summary: Update an API key (Admin only)
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ApiKeyUpdate'
 *           example:
 *             key: "sk-updatedkey456"
 *     responses:
 *       200:
 *         description: API key updated successfully
 *       400:
 *         description: Invalid key ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin only
 *       404:
 *         description: Key not found
 *       500:
 *         description: Internal server error
 */
router.put(
  "/:id",
  /*auth*/
  /*adminAuth*/
  validation.apiKey.params,
  validation.apiKey.update,
  openAIKeyController.updateApiKey
);

/**
 * @swagger
 * /api-key/{id}:
 *   delete:
 *     summary: Delete an API key (Admin only)
 *     tags: [API Keys]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: API key ID
 *     responses:
 *       200:
 *         description: API key deleted successfully
 *       400:
 *         description: Invalid key ID
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin only
 *       404:
 *         description: Key not found
 *       500:
 *         description: Internal server error
 */
router.delete(
  "/:id",
  /*auth*/
  /*adminAuth*/
  validation.apiKey.params,
  openAIKeyController.deleteApiKey
);

export default router;
