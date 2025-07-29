const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const { subscriptionSchemas } = require('../schemas');

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
 * /api/subscriptions/plans:
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
router.get('/plans', subscriptionController.getPlans);

/**
 * @swagger
 * /api/subscriptions/checkout:
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
 *                 description: Number of trial days
 *               successUrl:
 *                 type: string
 *                 description: Success redirect URL
 *               failureUrl:
 *                 type: string
 *                 description: Failure redirect URL
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
    validate(subscriptionSchemas.createCheckout), 
    subscriptionController.createCheckout
);

/**
 * @swagger
 * /api/subscriptions:
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
    validate(subscriptionSchemas.createSubscription), 
    subscriptionController.createSubscription
);

/**
 * @swagger
 * /api/subscriptions/me:
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
router.get('/me', auth, subscriptionController.getUserSubscription);

/**
 * @swagger
 * /api/subscriptions/{subscriptionId}/cancel:
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
    validate(subscriptionSchemas.cancelSubscription), 
    subscriptionController.cancelSubscription
);

/**
 * @swagger
 * /api/subscriptions/{subscriptionId}:
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
    validate(subscriptionSchemas.updateSubscription), 
    subscriptionController.updateSubscription
);

/**
 * @swagger
 * /api/subscriptions/webhook:
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
router.post('/webhook', subscriptionController.handleWebhook);

module.exports = router;
