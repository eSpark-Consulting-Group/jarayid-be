import { Router } from "express";

import schemas from "../schemas/index.js";
import createValidationMiddleware from "../middleware/validate.js";
import { RssSummarizationController } from "../controllers/index.js";
import { /*auth*/ adminAuth } from "../middleware/index.js";

const router = Router();
const rssSummarizationController = new RssSummarizationController();
const validation = createValidationMiddleware(schemas);

/**
 * @swagger
 * /rss-summarization:
 *   post:
 *     summary: Create or update global RSS summarization settings (Admin only)
 *     tags: [RSS Summarization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RssSummarizationSettingCreateOrUpdate'
 *     responses:
 *       201:
 *         description: RSS Summarization settings saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RssSummarizationSetting'
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied - Admin role required
 *       404:
 *         description: Category not found
 *       500:
 *         description: Internal server error
 */
router.post(
  "/",
  /*auth*/
  /*adminAuth*/
  validation.rssSummarization.createOrUpdate,
  rssSummarizationController.upsertSettings
);

/**
 * @swagger
 * /rss-summarization:
 *   get:
 *     summary: Get current RSS summarization settings
 *     tags: [RSS Summarization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: RSS summarization settings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RssSummarizationSetting'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/", /*auth*/ /*adminAuth*/ rssSummarizationController.getSettings);

export default router;
