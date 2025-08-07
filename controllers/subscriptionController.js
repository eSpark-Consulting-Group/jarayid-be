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
                    failureUrl,

                },
                {
                    checkoutType: 'widget' // Default to widget checkout
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
     * Generate widget checkout data for subscription
     */
    async createWidgetCheckout(req, res) {
        try {
            const { priceId, trialDays, checkoutType = 'widget' } = req.body;
            const userId = req.user.id;

            if (!priceId) {
                return errorResponse(res, 'Price ID is required', 400);
            }

            // Use widget method if checkoutType is widget
            if (checkoutType === 'widget') {
                const widgetData = await paddleSubscriptionService.generateWidgetCheckout(
                    priceId,
                    {
                        userId,
                        email: req.user.email
                    },
                    {
                        trialDays
                    }
                );

                return successResponse(res, {
                    ...widgetData,
                    message: 'Widget checkout data generated successfully'
                });
            } else {
                // Fallback to URL checkout with widget option
                const checkoutResult = await paddleSubscriptionService.generateCheckoutUrl(
                    priceId,
                    {
                        userId,
                        email: req.user.email
                    },
                    {
                        trialDays,
                        checkoutType
                    }
                );

                return successResponse(res, {
                    checkoutUrl: checkoutResult,
                    type: 'redirect',
                    message: 'Checkout URL generated successfully'
                });
            }

        } catch (error) {
            logger.error('Error creating widget checkout:', error);
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
            const isValid = await this.verifyWebhookSignature(signature, body);
            if (!isValid) {
                return errorResponse(res, 'Invalid webhook signature', 400);
            }

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
     * Get subscription plans/prices from Paddle API
     */
    async getPlans(req, res) {
        try {
            const plans = await this.fetchPlansFromPaddle();
            const mergedPrices = plans.flatMap((plan) =>
              Object.values(plan.prices).map((price) => ({
                ...price,
                id: plan.id,
                name: plan.name,
                features: plan.features,
                savings: plan.savings,
              }))
            );
            return successResponse(res, {
              ALL_PLANS: mergedPrices,
              message: "Subscription plans retrieved successfully",
            });


        } catch (error) {
            logger.error('Error getting plans:', error);
            return errorResponse(res, error.message, 500);
        }
    }

    /**
     * Fetch products and prices from Paddle API
     */
    async fetchPlansFromPaddle() {
        try {
            const { paddle } = await import('../config/paddle.js');

            // Fetch products from Paddle
            const productsResponse = await fetch('https://sandbox-api.paddle.com/products', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${process.env.PADDLE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!productsResponse.ok) {
                throw new Error(`Failed to fetch products: ${productsResponse.status} ${productsResponse.statusText}`);
            }

            const productsData = await productsResponse.json();

            // Fetch prices from Paddle
            const pricesResponse = await fetch('https://sandbox-api.paddle.com/prices', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${process.env.PADDLE_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!pricesResponse.ok) {
                throw new Error(`Failed to fetch prices: ${pricesResponse.status} ${pricesResponse.statusText}`);
            }

            const pricesData = await pricesResponse.json();

            // Map products with their prices
            const plans = productsData.data.map(product => {
                // Find all prices for this product
                const productPrices = pricesData.data.filter(price => price.product_id === product.id);

                // Group prices by billing cycle
                const pricesByInterval = productPrices.reduce((acc, price) => {
                    let interval = 'ONE_TIME';
                    
                    if (price.billing_cycle) {
                        interval = price.billing_cycle.interval.toUpperCase();
                        if (price.billing_cycle.frequency > 1) {
                            interval = `${price.billing_cycle.frequency}_${interval}S`;
                        } else {
                            interval = interval === 'MONTH' ? 'MONTHLY' : 
                                     interval === 'YEAR' ? 'YEARLY' : interval;
                        }
                    }

                    acc[interval] = {
                        id: price.id,
                        name: price.name,
                        description: price.description,
                        amount: parseFloat(price.unit_price.amount) / 100, // Convert from cents
                        currency: price.unit_price.currency_code,
                        interval: interval,
                        billingCycle: price.billing_cycle,
                        quantity: price.quantity,
                        status: price.status,
                        createdAt: price.created_at,
                        updatedAt: price.updated_at
                    };

                    return acc;
                }, {});

                // Calculate savings for yearly vs monthly (if both exist)
                let savings = null;
                if (pricesByInterval.YEARLY && pricesByInterval.MONTHLY) {
                    const yearlyMonthly = pricesByInterval.YEARLY.amount / 12;
                    const monthlyPrice = pricesByInterval.MONTHLY.amount;
                    const savingsPercent = Math.round(((monthlyPrice - yearlyMonthly) / monthlyPrice) * 100);
                    if (savingsPercent > 0) {
                        savings = `${savingsPercent}%`;
                    }
                }

                // Extract features from custom_data
                let features = [];
                if (product.custom_data && product.custom_data.features) {
                    features = Object.entries(product.custom_data.features)
                        .filter(([key, value]) => value === true)
                        .map(([key, value]) => this.formatFeatureName(key));
                }

                // Add suggested addons if available
                let suggestedAddons = [];
                if (product.custom_data && product.custom_data.suggested_addons) {
                    suggestedAddons = product.custom_data.suggested_addons;
                }

                return {
                    id: product.id,
                    name: product.name,
                    description: product.description,
                    imageUrl: product.image_url,
                    type: product.type,
                    status: product.status,
                    taxCategory: product.tax_category,
                    customData: product.custom_data,
                    prices: pricesByInterval,
                    features,
                    suggestedAddons,
                    savings,
                    upgradeDescription: product.custom_data?.upgrade_description || null,
                    createdAt: product.created_at,
                    updatedAt: product.updated_at
                };
            });

            // Filter only active products and sort by creation date
            const activePlans = plans
                .filter(plan => plan.status === 'active')
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

            logger.info(`Successfully fetched ${activePlans.length} active plans from Paddle`);

            return activePlans;

        } catch (error) {
            logger.error('Error fetching plans from Paddle:', error);
            
            // Fallback to hardcoded plans if Paddle API fails
            logger.warn('Falling back to hardcoded plans due to Paddle API error');
            return this.getFallbackPlans();
        }
    }

    /**
     * Format feature name from snake_case to readable format
     */
    formatFeatureName(featureName) {
        return featureName
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    /**
     * Fallback plans in case Paddle API is unavailable
     */
    getFallbackPlans() {
        return [
            {
                id: 'fallback_monthly',
                name: 'Premium Monthly',
                description: 'Monthly premium subscription with all features',
                type: 'standard',
                status: 'active',
                prices: {
                    MONTHLY: {
                        id: process.env.PADDLE_MONTHLY_PRICE_ID || 'monthly_fallback',
                        amount: 9.99,
                        currency: 'USD',
                        interval: 'MONTHLY'
                    }
                },
                features: [
                    'Unlimited articles',
                    'AI summaries',
                    'Priority support',
                    'No ads'
                ]
            },
            {
                id: 'fallback_yearly',
                name: 'Premium Yearly',
                description: 'Yearly premium subscription with all features and savings',
                type: 'standard',
                status: 'active',
                prices: {
                    YEARLY: {
                        id: process.env.PADDLE_YEARLY_PRICE_ID || 'yearly_fallback',
                        amount: 99.99,
                        currency: 'USD',
                        interval: 'YEARLY'
                    }
                },
                features: [
                    'Unlimited articles',
                    'AI summaries',
                    'Priority support',
                    'No ads',
                    '2 months free'
                ],
                savings: '17%'
            }
        ];
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

    /**
     * Get orphaned subscriptions (admin only)
     */
    async getOrphanedSubscriptions(req, res) {
        try {
            // Check if user is admin (implement your admin check logic)
            // For now, we'll allow any authenticated user
            
            const orphanedSubscriptions = await paddleSubscriptionService.getOrphanedSubscriptions();

            return successResponse(res, {
                orphanedSubscriptions,
                count: orphanedSubscriptions.length,
                message: 'Orphaned subscriptions retrieved successfully'
            });

        } catch (error) {
            logger.error('Error getting orphaned subscriptions:', error);
            return errorResponse(res, error.message, 500);
        }
    }

    /**
     * Link orphaned subscription to user (admin only)
     */
    async linkOrphanedSubscription(req, res) {
        try {
            const { paddleSubscriptionId, userId } = req.body;

            if (!paddleSubscriptionId || !userId) {
                return errorResponse(res, 'Paddle subscription ID and user ID are required', 400);
            }

            const linkedSubscription = await paddleSubscriptionService.linkOrphanedSubscription(
                paddleSubscriptionId,
                userId
            );

            return successResponse(res, {
                subscription: linkedSubscription,
                message: 'Subscription linked successfully'
            });

        } catch (error) {
            logger.error('Error linking orphaned subscription:', error);
            return errorResponse(res, error.message, 500);
        }
    }
}

export default new SubscriptionController();
