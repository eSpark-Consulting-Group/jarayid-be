import { paddle } from '../config/paddle.js';
import prisma from '../prisma/index.js';
import winston from 'winston';

// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] Paddle: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'combined.log' })
    ]
});

class PaddleSubscriptionService {
    
    /**
     * Create a customer in Paddle
     * @param {Object} userData - User data
     * @returns {Promise<Object>} Customer object
     */
    async createCustomer(userData) {
        try {
            const customer = await paddle.customers.create({
                email: userData.email,
                name: userData.name?.english || userData.name?.arabic || userData.email,
                customData: {
                    userId: userData.id,
                    country: userData.country
                }
            });
            
            logger.info(`Paddle customer created: ${customer.id} for user: ${userData.id}`);
            return customer;
        } catch (error) {
            logger.error('Error creating Paddle customer:', error);
            throw new Error(`Failed to create customer: ${error.message}`);
        }
    }

    /**
     * Create a subscription for a user
     * @param {String} userId - User ID
     * @param {String} priceId - Paddle price ID
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Subscription object
     */
    async createSubscription(userId, priceId, options = {}) {
        try {
            // Get user data
            const user = await prisma.user.findUnique({
                where: { id: userId },
                include: { subscriptions: true }
            });

            if (!user) {
                throw new Error('User not found');
            }

            // Check if user already has an active subscription
            const existingSubscription = await prisma.subscription.findFirst({
                where: {
                    userId,
                    status: { in: ['ACTIVE', 'TRIALING', 'PAUSED'] }
                }
            });

            if (existingSubscription) {
                throw new Error('User already has an active subscription');
            }

            // Create or get Paddle customer
            let paddleCustomerId = options.customerId;
            if (!paddleCustomerId) {
                const customer = await this.createCustomer(user);
                paddleCustomerId = customer.id;
            }

            // Create subscription in Paddle
            const paddleSubscription = await paddle.subscriptions.create({
                customerId: paddleCustomerId,
                items: [{
                    priceId: priceId,
                    quantity: 1
                }],
                customData: {
                    userId: userId
                },
                trialPeriod: options.trialDays ? {
                    frequency: {
                        type: 'day',
                        interval: options.trialDays
                    }
                } : undefined
            });

            // Create subscription in database
            const subscription = await prisma.subscription.create({
                data: {
                    userId,
                    paddleSubscriptionId: paddleSubscription.id,
                    paddleCustomerId: paddleCustomerId,
                    paddlePlanId: priceId,
                    status: paddleSubscription.status.toUpperCase(),
                    currentPeriodStart: new Date(paddleSubscription.currentBillingPeriod?.startsAt),
                    currentPeriodEnd: new Date(paddleSubscription.currentBillingPeriod?.endsAt),
                    currency: paddleSubscription.items[0]?.price?.unitPrice?.currencyCode,
                    amount: parseFloat(paddleSubscription.items[0]?.price?.unitPrice?.amount) / 100,
                    interval: this.mapPaddleIntervalToDb(paddleSubscription.items[0]?.price?.billingCycle?.frequency),
                    isPremium: true,
                    trialEndsAt: paddleSubscription.scheduledChange?.action === 'pause' ? 
                        new Date(paddleSubscription.scheduledChange.effectiveAt) : null,
                    metadata: {
                        paddleData: paddleSubscription,
                        createdVia: 'api'
                    }
                }
            });

            logger.info(`Subscription created for user ${userId}: ${subscription.id}`);
            return {
                subscription,
                paddleSubscription,
                checkoutUrl: null // Will be generated separately if needed
            };

        } catch (error) {
            logger.error('Error creating subscription:', error);
            throw new Error(`Failed to create subscription: ${error.message}`);
        }
    }

    /**
     * Generate checkout URL for subscription
     * @param {String} priceId - Paddle price ID
     * @param {Object} customerData - Customer information
     * @param {Object} options - Additional options
     * @returns {Promise<String>} Checkout URL
     */
    async generateCheckoutUrl(priceId, customerData, options = {}) {
        try {
            const checkoutPayload = {
                items: [{
                    priceId: priceId,
                    quantity: 1
                }],
                customData: {
                    userId: customerData.userId
                },
                customer: {
                    email: customerData.email,
                    customData: {
                        userId: customerData.userId
                    }
                },
                settings: {
                    successUrl: options.successUrl || `${process.env.FRONTEND_URL}/subscription/success`,
                    failureUrl: options.failureUrl || `${process.env.FRONTEND_URL}/subscription/failed`
                }
            };

            if (options.trialDays) {
                checkoutPayload.trialPeriod = {
                    frequency: {
                        type: 'day',
                        interval: options.trialDays
                    }
                };
            }

            const checkout = await paddle.checkouts.create(checkoutPayload);
            
            logger.info(`Checkout URL generated for user ${customerData.userId}`);
            return checkout.url;

        } catch (error) {
            logger.error('Error generating checkout URL:', error);
            throw new Error(`Failed to generate checkout URL: ${error.message}`);
        }
    }

    /**
     * Cancel a subscription
     * @param {String} subscriptionId - Local subscription ID
     * @param {Boolean} immediate - Cancel immediately or at period end
     * @returns {Promise<Object>} Updated subscription
     */
    async cancelSubscription(subscriptionId, immediate = false) {
        try {
            const subscription = await prisma.subscription.findUnique({
                where: { id: subscriptionId },
                include: { user: true }
            });

            if (!subscription) {
                throw new Error('Subscription not found');
            }

            if (!subscription.paddleSubscriptionId) {
                throw new Error('Paddle subscription ID not found');
            }

            // Cancel in Paddle
            const cancelledSubscription = await paddle.subscriptions.cancel(
                subscription.paddleSubscriptionId,
                {
                    effectiveFrom: immediate ? 'immediately' : 'next_billing_period'
                }
            );

            // Update local subscription
            const updatedSubscription = await prisma.subscription.update({
                where: { id: subscriptionId },
                data: {
                    status: immediate ? 'CANCELLED' : 'ACTIVE',
                    cancelAtPeriodEnd: !immediate,
                    cancelledAt: immediate ? new Date() : null,
                    isPremium: immediate ? false : true,
                    metadata: {
                        ...subscription.metadata,
                        cancelledVia: 'api',
                        cancelledAt: new Date().toISOString()
                    }
                }
            });

            logger.info(`Subscription cancelled for user ${subscription.userId}: ${subscriptionId}`);
            return updatedSubscription;

        } catch (error) {
            logger.error('Error cancelling subscription:', error);
            throw new Error(`Failed to cancel subscription: ${error.message}`);
        }
    }

    /**
     * Get subscription details
     * @param {String} userId - User ID
     * @returns {Promise<Object>} Subscription details
     */
    async getUserSubscription(userId) {
        try {
            const subscription = await prisma.subscription.findFirst({
                where: { userId },
                include: { user: true },
                orderBy: { createdAt: 'desc' }
            });

            if (!subscription) {
                return null;
            }

            // Get latest data from Paddle if subscription is active
            if (subscription.paddleSubscriptionId && ['ACTIVE', 'TRIALING', 'PAUSED'].includes(subscription.status)) {
                try {
                    const paddleSubscription = await paddle.subscriptions.get(subscription.paddleSubscriptionId);
                    
                    // Update local data with latest from Paddle
                    const updatedSubscription = await prisma.subscription.update({
                        where: { id: subscription.id },
                        data: {
                            status: paddleSubscription.status.toUpperCase(),
                            currentPeriodStart: new Date(paddleSubscription.currentBillingPeriod?.startsAt),
                            currentPeriodEnd: new Date(paddleSubscription.currentBillingPeriod?.endsAt),
                            nextPaymentAt: new Date(paddleSubscription.nextBilledAt),
                            metadata: {
                                ...subscription.metadata,
                                lastSyncedAt: new Date().toISOString(),
                                paddleData: paddleSubscription
                            }
                        }
                    });

                    return updatedSubscription;
                } catch (paddleError) {
                    logger.warn(`Could not sync with Paddle for subscription ${subscription.id}:`, paddleError);
                }
            }

            return subscription;

        } catch (error) {
            logger.error('Error getting user subscription:', error);
            throw new Error(`Failed to get subscription: ${error.message}`);
        }
    }

    /**
     * Handle Paddle webhook events
     * @param {Object} event - Paddle webhook event
     * @returns {Promise<Boolean>} Success status
     */
    async handleWebhook(event) {
        try {
            logger.info(`Processing Paddle webhook: ${event.event_type}`);

            switch (event.event_type) {
                case 'subscription.created':
                    return await this.handleSubscriptionCreated(event.data);
                
                case 'subscription.updated':
                    return await this.handleSubscriptionUpdated(event.data);
                
                case 'subscription.cancelled':
                    return await this.handleSubscriptionCancelled(event.data);
                
                case 'subscription.paused':
                    return await this.handleSubscriptionPaused(event.data);
                
                case 'subscription.resumed':
                    return await this.handleSubscriptionResumed(event.data);
                
                case 'transaction.completed':
                    return await this.handlePaymentCompleted(event.data);
                
                case 'transaction.payment_failed':
                    return await this.handlePaymentFailed(event.data);
                
                default:
                    logger.info(`Unhandled webhook event: ${event.event_type}`);
                    return true;
            }

        } catch (error) {
            logger.error('Error handling Paddle webhook:', error);
            return false;
        }
    }

    /**
     * Handle subscription created webhook
     */
    async handleSubscriptionCreated(subscriptionData) {
        try {
            const userId = subscriptionData.custom_data?.userId;
            
            if (!userId) {
                logger.warn('No userId found in subscription webhook data');
                return false;
            }

            // Check if subscription already exists
            const existingSubscription = await prisma.subscription.findFirst({
                where: { paddleSubscriptionId: subscriptionData.id }
            });

            if (existingSubscription) {
                logger.info(`Subscription ${subscriptionData.id} already exists, updating...`);
                return await this.handleSubscriptionUpdated(subscriptionData);
            }

            // Create new subscription
            await prisma.subscription.create({
                data: {
                    userId,
                    paddleSubscriptionId: subscriptionData.id,
                    paddleCustomerId: subscriptionData.customer_id,
                    paddlePlanId: subscriptionData.items[0]?.price?.id,
                    status: subscriptionData.status.toUpperCase(),
                    currentPeriodStart: new Date(subscriptionData.current_billing_period?.starts_at),
                    currentPeriodEnd: new Date(subscriptionData.current_billing_period?.ends_at),
                    currency: subscriptionData.items[0]?.price?.unit_price?.currency_code,
                    amount: parseFloat(subscriptionData.items[0]?.price?.unit_price?.amount) / 100,
                    interval: this.mapPaddleIntervalToDb(subscriptionData.items[0]?.price?.billing_cycle?.frequency),
                    isPremium: true,
                    nextPaymentAt: new Date(subscriptionData.next_billed_at),
                    metadata: {
                        webhookData: subscriptionData,
                        createdVia: 'webhook'
                    }
                }
            });

            logger.info(`Subscription created via webhook for user ${userId}`);
            return true;

        } catch (error) {
            logger.error('Error handling subscription created webhook:', error);
            return false;
        }
    }

    /**
     * Handle subscription updated webhook
     */
    async handleSubscriptionUpdated(subscriptionData) {
        try {
            const subscription = await prisma.subscription.findFirst({
                where: { paddleSubscriptionId: subscriptionData.id }
            });

            if (!subscription) {
                logger.warn(`Subscription ${subscriptionData.id} not found for update`);
                return false;
            }

            await prisma.subscription.update({
                where: { id: subscription.id },
                data: {
                    status: subscriptionData.status.toUpperCase(),
                    currentPeriodStart: new Date(subscriptionData.current_billing_period?.starts_at),
                    currentPeriodEnd: new Date(subscriptionData.current_billing_period?.ends_at),
                    nextPaymentAt: new Date(subscriptionData.next_billed_at),
                    isPremium: ['active', 'trialing'].includes(subscriptionData.status.toLowerCase()),
                    metadata: {
                        ...subscription.metadata,
                        lastWebhookUpdate: new Date().toISOString(),
                        webhookData: subscriptionData
                    }
                }
            });

            logger.info(`Subscription ${subscription.id} updated via webhook`);
            return true;

        } catch (error) {
            logger.error('Error handling subscription updated webhook:', error);
            return false;
        }
    }

    /**
     * Handle subscription cancelled webhook
     */
    async handleSubscriptionCancelled(subscriptionData) {
        try {
            const subscription = await prisma.subscription.findFirst({
                where: { paddleSubscriptionId: subscriptionData.id }
            });

            if (!subscription) {
                logger.warn(`Subscription ${subscriptionData.id} not found for cancellation`);
                return false;
            }

            await prisma.subscription.update({
                where: { id: subscription.id },
                data: {
                    status: 'CANCELLED',
                    cancelledAt: new Date(),
                    isPremium: false,
                    metadata: {
                        ...subscription.metadata,
                        cancelledVia: 'webhook',
                        cancelledAt: new Date().toISOString()
                    }
                }
            });

            logger.info(`Subscription ${subscription.id} cancelled via webhook`);
            return true;

        } catch (error) {
            logger.error('Error handling subscription cancelled webhook:', error);
            return false;
        }
    }

    /**
     * Handle payment completed webhook
     */
    async handlePaymentCompleted(transactionData) {
        try {
            const subscriptionId = transactionData.subscription_id;
            
            if (!subscriptionId) {
                logger.info('Payment completed but no subscription ID found');
                return true;
            }

            const subscription = await prisma.subscription.findFirst({
                where: { paddleSubscriptionId: subscriptionId }
            });

            if (!subscription) {
                logger.warn(`Subscription ${subscriptionId} not found for payment update`);
                return false;
            }

            await prisma.subscription.update({
                where: { id: subscription.id },
                data: {
                    lastPaymentAt: new Date(),
                    failedPaymentCount: 0,
                    status: 'ACTIVE',
                    isPremium: true,
                    metadata: {
                        ...subscription.metadata,
                        lastPayment: {
                            amount: transactionData.details?.totals?.total,
                            currency: transactionData.currency_code,
                            paidAt: new Date().toISOString(),
                            transactionId: transactionData.id
                        }
                    }
                }
            });

            logger.info(`Payment completed for subscription ${subscription.id}`);
            return true;

        } catch (error) {
            logger.error('Error handling payment completed webhook:', error);
            return false;
        }
    }

    /**
     * Handle payment failed webhook
     */
    async handlePaymentFailed(transactionData) {
        try {
            const subscriptionId = transactionData.subscription_id;
            
            if (!subscriptionId) {
                logger.info('Payment failed but no subscription ID found');
                return true;
            }

            const subscription = await prisma.subscription.findFirst({
                where: { paddleSubscriptionId: subscriptionId }
            });

            if (!subscription) {
                logger.warn(`Subscription ${subscriptionId} not found for payment failure`);
                return false;
            }

            await prisma.subscription.update({
                where: { id: subscription.id },
                data: {
                    failedPaymentCount: subscription.failedPaymentCount + 1,
                    status: 'PAST_DUE',
                    metadata: {
                        ...subscription.metadata,
                        lastFailedPayment: {
                            failedAt: new Date().toISOString(),
                            transactionId: transactionData.id,
                            reason: transactionData.failure_reason
                        }
                    }
                }
            });

            logger.info(`Payment failed for subscription ${subscription.id}`);
            return true;

        } catch (error) {
            logger.error('Error handling payment failed webhook:', error);
            return false;
        }
    }

    /**
     * Map Paddle interval to database enum
     */
    mapPaddleIntervalToDb(paddleFrequency) {
        if (!paddleFrequency) return null;
        
        const { type, interval } = paddleFrequency;
        
        if (type === 'month' && interval === 1) return 'MONTHLY';
        if (type === 'year' && interval === 1) return 'YEARLY';
        if (type === 'week' && interval === 1) return 'WEEKLY';
        
        return 'MONTHLY'; // Default fallback
    }

    /**
     * Helper methods for subscription paused/resumed
     */
    async handleSubscriptionPaused(subscriptionData) {
        return await this.updateSubscriptionStatus(subscriptionData.id, 'PAUSED', { pausedAt: new Date() });
    }

    async handleSubscriptionResumed(subscriptionData) {
        return await this.updateSubscriptionStatus(subscriptionData.id, 'ACTIVE', { resumedAt: new Date(), pausedAt: null });
    }

    async updateSubscriptionStatus(paddleSubscriptionId, status, additionalData = {}) {
        try {
            const subscription = await prisma.subscription.findFirst({
                where: { paddleSubscriptionId }
            });

            if (!subscription) {
                logger.warn(`Subscription ${paddleSubscriptionId} not found for status update`);
                return false;
            }

            await prisma.subscription.update({
                where: { id: subscription.id },
                data: {
                    status,
                    ...additionalData,
                    metadata: {
                        ...subscription.metadata,
                        statusUpdatedAt: new Date().toISOString()
                    }
                }
            });

            logger.info(`Subscription ${subscription.id} status updated to ${status}`);
            return true;

        } catch (error) {
            logger.error('Error updating subscription status:', error);
            return false;
        }
    }
}

export default new PaddleSubscriptionService();
