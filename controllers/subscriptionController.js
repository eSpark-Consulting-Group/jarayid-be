import paddleSubscriptionService from '../services/paddleSubscriptionService.js';
import response from '../utils/response.js';
import prisma from '../prisma/index.js';
import winston from 'winston';

// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] Subscription: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

const { success: successResponse, error: errorResponse } = response;

class SubscriptionController {
    
    /**
     * Generate checkout URL for subscription
     */
    async createCheckout(req, res) {
        try {
            const { priceId, trialDays, successUrl, failureUrl } = req.body;
            const userId = req.user.id;

            if (!priceId) {
                return errorResponse(res, 'Price ID is required', 400);
            }

            const checkoutUrl = await paddleSubscriptionService.generateCheckoutUrl(
                priceId,
                {
                    userId,
                    email: req.user.email
                },
                {
                    trialDays,
                    successUrl,
                    failureUrl
                }
            );

            return successResponse(res, {
                checkoutUrl,
                message: 'Checkout URL generated successfully'
            });

        } catch (error) {
            logger.error('Error creating checkout:', error);
            return errorResponse(res, error.message, 500);
        }
    }

    /**
     * Create subscription directly (for API integrations)
     */
    async createSubscription(req, res) {
        try {
            const { priceId, customerId, trialDays } = req.body;
            const userId = req.user.id;

            if (!priceId) {
                return errorResponse(res, 'Price ID is required', 400);
            }

            const result = await paddleSubscriptionService.createSubscription(
                userId,
                priceId,
                { customerId, trialDays }
            );

            return successResponse(res, {
                subscription: result.subscription,
                message: 'Subscription created successfully'
            });

        } catch (error) {
            logger.error('Error creating subscription:', error);
            return errorResponse(res, error.message, 500);
        }
    }

    /**
     * Get user's subscription details
     */
    async getUserSubscription(req, res) {
        try {
            const userId = req.user.id;

            const subscription = await paddleSubscriptionService.getUserSubscription(userId);

            if (!subscription) {
                return successResponse(res, {
                    subscription: null,
                    hasActiveSubscription: false,
                    message: 'No subscription found'
                });
            }

            const isActive = ['ACTIVE', 'TRIALING'].includes(subscription.status);

            return successResponse(res, {
                subscription: {
                    id: subscription.id,
                    status: subscription.status,
                    isPremium: subscription.isPremium,
                    currentPeriodStart: subscription.currentPeriodStart,
                    currentPeriodEnd: subscription.currentPeriodEnd,
                    nextPaymentAt: subscription.nextPaymentAt,
                    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
                    currency: subscription.currency,
                    amount: subscription.amount,
                    interval: subscription.interval,
                    trialEndsAt: subscription.trialEndsAt,
                    createdAt: subscription.createdAt
                },
                hasActiveSubscription: isActive,
                message: 'Subscription retrieved successfully'
            });

        } catch (error) {
            logger.error('Error getting user subscription:', error);
            return errorResponse(res, error.message, 500);
        }
    }

    /**
     * Cancel subscription
     */
    async cancelSubscription(req, res) {
        try {
            const { subscriptionId } = req.params;
            const { immediate = false } = req.body;
            const userId = req.user.id;

            // Verify subscription belongs to user
            const subscription = await prisma.subscription.findFirst({
                where: {
                    id: subscriptionId,
                    userId
                }
            });

            if (!subscription) {
                return errorResponse(res, 'Subscription not found', 404);
            }

            const cancelledSubscription = await paddleSubscriptionService.cancelSubscription(
                subscriptionId,
                immediate
            );

            return successResponse(res, {
                subscription: cancelledSubscription,
                message: immediate ? 
                    'Subscription cancelled immediately' : 
                    'Subscription will be cancelled at the end of current period'
            });

        } catch (error) {
            logger.error('Error cancelling subscription:', error);
            return errorResponse(res, error.message, 500);
        }
    }

    /**
     * Handle Paddle webhooks
     */
    async handleWebhook(req, res) {
        try {
            const signature = req.headers['paddle-signature'];
            const body = req.body;

            // Verify webhook signature (implement signature verification)
            // const isValid = await this.verifyWebhookSignature(signature, body);
            // if (!isValid) {
            //     return errorResponse(res, 'Invalid webhook signature', 400);
            // }

            const success = await paddleSubscriptionService.handleWebhook(body);

            if (success) {
                return res.status(200).json({ success: true });
            } else {
                return res.status(400).json({ success: false });
            }

        } catch (error) {
            logger.error('Error handling webhook:', error);
            return res.status(500).json({ success: false, error: error.message });
        }
    }

    /**
     * Get subscription plans/prices
     */
    async getPlans(req, res) {
        try {
            // This would typically come from your configuration or Paddle API
            const plans = [
                {
                    id: 'monthly_premium',
                    name: 'Premium Monthly',
                    priceId: process.env.PADDLE_MONTHLY_PRICE_ID,
                    interval: 'MONTHLY',
                    price: 9.99,
                    currency: 'USD',
                    features: [
                        'Unlimited articles',
                        'AI summaries',
                        'Priority support',
                        'No ads'
                    ]
                },
                {
                    id: 'yearly_premium',
                    name: 'Premium Yearly',
                    priceId: process.env.PADDLE_YEARLY_PRICE_ID,
                    interval: 'YEARLY',
                    price: 99.99,
                    currency: 'USD',
                    savings: '17%',
                    features: [
                        'Unlimited articles',
                        'AI summaries',
                        'Priority support',
                        'No ads',
                        '2 months free'
                    ]
                }
            ];

            return successResponse(res, {
                plans,
                message: 'Subscription plans retrieved successfully'
            });

        } catch (error) {
            logger.error('Error getting plans:', error);
            return errorResponse(res, error.message, 500);
        }
    }

    /**
     * Update subscription (change plan)
     */
    async updateSubscription(req, res) {
        try {
            const { subscriptionId } = req.params;
            const { newPriceId } = req.body;
            const userId = req.user.id;

            // Verify subscription belongs to user
            const subscription = await prisma.subscription.findFirst({
                where: {
                    id: subscriptionId,
                    userId
                }
            });

            if (!subscription) {
                return errorResponse(res, 'Subscription not found', 404);
            }

            if (!subscription.paddleSubscriptionId) {
                return errorResponse(res, 'Invalid subscription state', 400);
            }

            // Update subscription in Paddle
            const { paddle } = await import('../config/paddle.js');
            const updatedPaddleSubscription = await paddle.paddle.subscriptions.update(
                subscription.paddleSubscriptionId,
                {
                    items: [{
                        priceId: newPriceId,
                        quantity: 1
                    }]
                }
            );

            // Update local subscription
            const updatedSubscription = await prisma.subscription.update({
                where: { id: subscriptionId },
                data: {
                    paddlePlanId: newPriceId,
                    metadata: {
                        ...subscription.metadata,
                        planUpdatedAt: new Date().toISOString(),
                        previousPlanId: subscription.paddlePlanId
                    }
                }
            });

            return successResponse(res, {
                subscription: updatedSubscription,
                message: 'Subscription updated successfully'
            });

        } catch (error) {
            logger.error('Error updating subscription:', error);
            return errorResponse(res, error.message, 500);
        }
    }

    /**
     * Verify webhook signature (implement based on Paddle's signature verification)
     */
    async verifyWebhookSignature(signature, body) {
        // Implement Paddle webhook signature verification
        // This is a placeholder - implement actual verification
        return true;
    }
}

export default SubscriptionController;
