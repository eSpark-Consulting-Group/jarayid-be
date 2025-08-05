import express from 'express';
import subscriptionController from '../controllers/subscriptionController.js';
import { auth, validate } from '../middleware/index.js';
import schemas from '../schemas/index.js';

const router = express.Router();
const validation = validate(schemas);

/**
 * @swagger
 * components:
 *   schemas:
 *     Subscription:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Subscription ID
 *         status:
 *           type: string
 *           enum: [ACTIVE, INACTIVE, CANCELLED, PAUSED, PAST_DUE, TRIALING, EXPIRED]
 *           description: Subscription status
 *         isPremium:
 *           type: boolean
 *           description: Whether user has premium access
 *         currentPeriodStart:
 *           type: string
 *           format: date-time
 *           description: Current billing period start date
 *         currentPeriodEnd:
 *           type: string
 *           format: date-time
 *           description: Current billing period end date
 *         nextPaymentAt:
 *           type: string
 *           format: date-time
 *           description: Next payment date
 *         cancelAtPeriodEnd:
 *           type: boolean
 *           description: Whether subscription will cancel at period end
 *         currency:
 *           type: string
 *           description: Currency code
 *         amount:
 *           type: number
 *           description: Subscription amount
 *         interval:
 *           type: string
 *           enum: [MONTHLY, YEARLY, WEEKLY]
 *           description: Billing interval
 *         trialEndsAt:
 *           type: string
 *           format: date-time
 *           description: Trial end date
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Subscription creation date
 *     
 *     SubscriptionPlan:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Plan ID
 *         name:
 *           type: string
 *           description: Plan name
 *         priceId:
 *           type: string
 *           description: Paddle price ID
 *         interval:
 *           type: string
 *           enum: [MONTHLY, YEARLY, WEEKLY]
 *           description: Billing interval
 *         price:
 *           type: number
 *           description: Plan price
 *         currency:
 *           type: string
 *           description: Currency code
 *         features:
 *           type: array
 *           items:
 *             type: string
 *           description: Plan features
 */

/**
 * @swagger
 * /subscriptions/plans:
 *   get:
 *     summary: Get available subscription plans
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: Subscription plans retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     plans:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/SubscriptionPlan'
 *                     message:
 *                       type: string
 */
router.get('/plans', subscriptionController.getPlans.bind(subscriptionController));

/**
 * @swagger
 * /subscriptions/checkout:
 *   post:
 *     summary: Create checkout URL for subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - priceId
 *             properties:
 *               priceId:
 *                 type: string
 *                 description: Paddle price ID
 *               trialDays:
 *                 type: integer
 *                 description: Number of trial days (optional)
 *             note: |
 *               Success and failure URLs are configured on the backend for security.
 *               They cannot be overridden from the frontend.
 *     responses:
 *       200:
 *         description: Checkout URL created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     checkoutUrl:
 *                       type: string
 *                       description: Paddle checkout URL
 *                     message:
 *                       type: string
 */
router.post('/checkout', 
    auth, 
    validation.subscription.createCheckout, 
    subscriptionController.createCheckout.bind(subscriptionController)
);

/**
 * @swagger
 * /subscriptions/widget-checkout:
 *   post:
 *     summary: Create widget checkout data for subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - priceId
 *             properties:
 *               priceId:
 *                 type: string
 *                 description: Paddle price ID
 *                 example: "pri_01234567890"
 *               trialDays:
 *                 type: integer
 *                 description: Trial period in days
 *                 example: 7
 *               checkoutType:
 *                 type: string
 *                 enum: [widget, redirect]
 *                 description: Type of checkout (widget or redirect)
 *                 example: "widget"
 *     responses:
 *       200:
 *         description: Widget checkout data generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Widget checkout data generated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     type:
 *                       type: string
 *                       example: "widget"
 *                     checkoutData:
 *                       type: object
 *                       description: Paddle widget configuration
 *                     customerId:
 *                       type: string
 *                       description: Paddle customer ID
 *                     priceId:
 *                       type: string
 *                       description: Paddle price ID
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 */
router.post('/widget-checkout', 
    auth, 
    validation.subscription.createWidgetCheckout, 
    subscriptionController.createWidgetCheckout.bind(subscriptionController)
);

/**
 * @swagger
 * /subscriptions:
 *   post:
 *     summary: Create subscription directly
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - priceId
 *             properties:
 *               priceId:
 *                 type: string
 *                 description: Paddle price ID
 *               customerId:
 *                 type: string
 *                 description: Existing Paddle customer ID
 *               trialDays:
 *                 type: integer
 *                 description: Number of trial days
 *     responses:
 *       201:
 *         description: Subscription created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       $ref: '#/components/schemas/Subscription'
 *                     message:
 *                       type: string
 */
router.post('/', 
    auth, 
    validation.subscription.createSubscription, 
    subscriptionController.createSubscription.bind(subscriptionController)
);

/**
 * @swagger
 * /subscriptions/me:
 *   get:
 *     summary: Get current user's subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       $ref: '#/components/schemas/Subscription'
 *                     hasActiveSubscription:
 *                       type: boolean
 *                       description: Whether user has active subscription
 *                     message:
 *                       type: string
 */
router.get('/me', auth, subscriptionController.getUserSubscription.bind(subscriptionController));

/**
 * @swagger
 * /subscriptions/{subscriptionId}/cancel:
 *   post:
 *     summary: Cancel subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               immediate:
 *                 type: boolean
 *                 default: false
 *                 description: Cancel immediately or at period end
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       $ref: '#/components/schemas/Subscription'
 *                     message:
 *                       type: string
 */
router.post('/:subscriptionId/cancel', 
    auth, 
    validation.subscription.params,
    validation.subscription.cancelSubscription, 
    subscriptionController.cancelSubscription.bind(subscriptionController)
);

/**
 * @swagger
 * /subscriptions/{subscriptionId}:
 *   put:
 *     summary: Update subscription (change plan)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPriceId
 *             properties:
 *               newPriceId:
 *                 type: string
 *                 description: New Paddle price ID
 *     responses:
 *       200:
 *         description: Subscription updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       $ref: '#/components/schemas/Subscription'
 *                     message:
 *                       type: string
 */
router.put('/:subscriptionId', 
    auth, 
    validation.subscription.params,
    validation.subscription.updateSubscription, 
    subscriptionController.updateSubscription.bind(subscriptionController)
);

/**
 * @swagger
 * /subscriptions/webhook:
 *   post:
 *     summary: Handle Paddle webhooks
 *     tags: [Subscriptions]
 *     description: Endpoint for Paddle to send webhook events
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Paddle webhook payload
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 */
router.post('/webhook', subscriptionController.handleWebhook.bind(subscriptionController));

/**
 * @swagger
 * /subscriptions/orphaned:
 *   get:
 *     summary: Get orphaned subscriptions (admin only)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     description: Get subscriptions that were created without userId and need manual linking
 *     responses:
 *       200:
 *         description: Orphaned subscriptions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     orphanedSubscriptions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           paddleSubscriptionId:
 *                             type: string
 *                           paddleCustomerId:
 *                             type: string
 *                           status:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                           metadata:
 *                             type: object
 *                     count:
 *                       type: integer
 *                     message:
 *                       type: string
 */
router.get('/orphaned', auth, subscriptionController.getOrphanedSubscriptions.bind(subscriptionController));

/**
 * @swagger
 * /subscriptions/link-orphaned:
 *   post:
 *     summary: Link orphaned subscription to user (admin only)
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     description: Manually link a subscription that was created without userId to a specific user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paddleSubscriptionId
 *               - userId
 *             properties:
 *               paddleSubscriptionId:
 *                 type: string
 *                 description: Paddle subscription ID to link
 *                 example: "sub_01234567890"
 *               userId:
 *                 type: string
 *                 description: User ID to link subscription to
 *                 example: "user-uuid-12345"
 *     responses:
 *       200:
 *         description: Subscription linked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     subscription:
 *                       $ref: '#/components/schemas/Subscription'
 *                     message:
 *                       type: string
 *       400:
 *         description: Bad request - missing required parameters
 *       404:
 *         description: Subscription or user not found
 */
router.post('/link-orphaned', auth, subscriptionController.linkOrphanedSubscription.bind(subscriptionController));

export default router;
