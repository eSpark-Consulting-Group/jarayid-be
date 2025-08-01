import { Router } from "express";
import { BugWebhookController } from "../controllers/index.js";

const router = Router();
const bugWebhookController = new BugWebhookController();

/**
 * @swagger
 * /bug-webhook/sentry:
 *   post:
 *     summary: Receive bug data from Sentry Webhook
 *     description: This endpoint is called by Sentry whenever a new error/event occurs. It stores bug details in the system.
 *     tags: [Bug Webhook]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/BugWebhookPayload'
 *     responses:
 *       201:
 *         description: Sentry bug received and stored successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BugWebhookResponse'
 *       400:
 *         description: Invalid payload
 *       500:
 *         description: Internal server error
 */
router.post("/sentry", bugWebhookController.handleSentryWebhook);

export default router;
