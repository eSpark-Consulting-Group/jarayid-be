import { paddle, paddleConfig } from '../config/paddle.js';
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
                custom_data: {
                    userId: userData.userId || userData.id,
                    country: userData.country
                }
            });
            
            logger.info(`Paddle customer created: ${customer.data.id} for user: ${userData.userId || userData.id}`);
            return customer.data;
        } catch (error) {
            // If customer already exists, try to find them
            if (error.code === 'customer_already_exists' || 
                error.message.includes('email conflicts with customer')) {
                logger.info(`Customer with email ${userData.email} already exists, attempting to find...`);
                
                // Extract customer ID from error message if available
                const match = error.message.match(/customer of id (ctm_[a-zA-Z0-9]+)/);
                if (match) {
                    const customerId = match[1];
                    logger.info(`Found customer ID in error message: ${customerId}`);
                    try {
                        const existingCustomer = await paddle.customers.get(customerId);
                        logger.info(`Successfully retrieved customer: ${JSON.stringify(existingCustomer)}`);
                        
                        // Return the customer data directly if it's not wrapped in .data
                        if (existingCustomer.id) {
                            return existingCustomer;
                        } else if (existingCustomer.data && existingCustomer.data.id) {
                            return existingCustomer.data;
                        } else {
                            logger.warn(`Unexpected customer response structure: ${JSON.stringify(existingCustomer)}`);
                        }
                    } catch (getError) {
                        logger.warn(`Could not get customer by ID: ${getError.message}`);
                    }
                }
                
                // Fallback to search by email
                return await this.findExistingCustomer(userData.email);
            }
            
            logger.error('Error creating Paddle customer:', error);
            throw new Error(`Failed to create customer: ${error.message}`);
        }
    }

    /**
     * Find existing customer by email
     * @param {String} email - Customer email
     * @returns {Promise<Object>} Customer object
     */
    async findExistingCustomer(email) {
        try {
            // Get customers and find by email
            const customers = await paddle.customers.list({
                email: [email]
            });
            
            if (customers.data && customers.data.length > 0) {
                logger.info(`Found existing Paddle customer: ${customers.data[0].id}`);
                return customers.data[0];
            }
            
            throw new Error(`Customer with email ${email} not found`);
        } catch (error) {
            logger.error('Error finding existing customer:', error);
            throw new Error(`Failed to find customer: ${error.message}`);
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
     * Generate checkout data for subscription (supports both URL and widget approaches)
     * @param {String} priceId - Paddle price ID
     * @param {Object} customerData - Customer information
     * @param {Object} options - Additional options (trialDays, checkoutType, etc.)
     * @returns {Promise<Object>} Checkout data (URL or transaction details)
     */
    async generateCheckoutUrl(priceId, customerData, options = {}) {
        try {
            // First, ensure we have a customer
            let customer = await this.findOrCreateCustomer(customerData);

            const transactionPayload = {
                items: [{
                    price_id: priceId,
                    quantity: 1
                }],
                customer_id: customer.paddleCustomerId,
                collection_mode: "automatic",
                custom_data: {
                    userId: customerData.userId
                }
                // Removed checkout.url as it needs to be approved in Paddle dashboard
                // Paddle will use the default checkout domain instead
            };

            // Handle trial period if specified
            if (options.trialDays && options.trialDays > 0) {
                // For trials, we'll create a subscription directly after successful checkout
                // Store trial info in custom_data for webhook processing
                transactionPayload.custom_data.trialDays = options.trialDays;
            }

            const transaction = await paddle.transactions.create(transactionPayload);
            
            // Debug the transaction response structure
            logger.info('Paddle: Transaction response structure:', {
                hasData: !!transaction.data,
                hasCheckout: !!transaction.checkout,
                checkoutUrl: transaction.checkout?.url,
                transactionId: transaction.id,
                fullResponse: transaction
            });
            
            // Paddle API returns transaction with checkout property directly, not under .data
            if (!transaction.checkout || !transaction.checkout.url) {
                logger.error('Paddle: Invalid transaction response structure:', {
                    hasTransaction: !!transaction,
                    hasCheckout: !!transaction?.checkout,
                    hasUrl: !!transaction?.checkout?.url,
                    responseKeys: transaction ? Object.keys(transaction) : []
                });
                throw new Error('No checkout URL returned from Paddle');
            }

            logger.info(`Checkout URL generated for user ${customerData.userId}`, {
                transactionId: transaction.id,
                priceId,
                trialDays: options.trialDays,
                checkoutUrl: transaction.checkout.url
            });

            // Return different data based on checkout type
            if (options.checkoutType === 'widget') {
                // For widget integration, return transaction details instead of just URL
                return {
                    type: 'widget',
                    transactionId: transaction.id,
                    checkoutUrl: transaction.checkout.url,
                    customerId: customer.paddleCustomerId,
                    priceId,
                    items: transactionPayload.items,
                    customData: transactionPayload.custom_data
                };
            }

            // Default: return just the URL for redirect approach
            return transaction.checkout.url;

        } catch (error) {
            logger.error('Error generating checkout URL:', error);
            throw new Error(`Failed to generate checkout URL: ${error.message}`);
        }
    }

    /**
     * Generate checkout data for widget integration
     * @param {String} priceId - Paddle price ID
     * @param {Object} customerData - Customer information
     * @param {Object} options - Additional options (trialDays, etc.)
     * @returns {Promise<Object>} Widget checkout data
     */
    async generateWidgetCheckout(priceId, customerData, options = {}) {
        try {
            // First, ensure we have a customer
            let customer = await this.findOrCreateCustomer(customerData);

            const checkoutData = {
                items: [{
                    priceId: priceId,
                    quantity: 1
                }],
                customerId: customer.paddleCustomerId,
                customData: {
                    userId: customerData.userId
                },
                settings: {
                    displayMode: 'overlay', // or 'inline'
                    theme: 'light', // or 'dark'
                    locale: 'en',
                    successUrl: `${process.env.FRONTEND_URL}/payment/success`,
                    closeUrl: `${process.env.FRONTEND_URL}/payment/cancel`
                }
            };

            // Handle trial period if specified
            if (options.trialDays && options.trialDays > 0) {
                checkoutData.customData.trialDays = options.trialDays;
            }

            logger.info(`Widget checkout data generated for user ${customerData.userId}`, {
                priceId,
                customerId: customer.paddleCustomerId,
                trialDays: options.trialDays
            });

            return {
                type: 'widget',
                checkoutData,
                customerId: customer.paddleCustomerId,
                priceId
            };

        } catch (error) {
            logger.error('Error generating widget checkout:', error);
            throw new Error(`Failed to generate widget checkout: ${error.message}`);
        }
    }

    /**
     * Find existing customer or create new one
     * @param {Object} customerData - Customer information
     * @returns {Promise<Object>} Customer with Paddle ID
     */
    async findOrCreateCustomer(customerData) {
        try {
            // First check if user already has a subscription with Paddle customer ID
            const existingSubscription = await prisma.subscription.findFirst({
                where: {
                    userId: customerData.userId,
                    paddleCustomerId: { not: null }
                }
            });

            if (existingSubscription && existingSubscription.paddleCustomerId) {
                logger.info(`Using existing Paddle customer ID: ${existingSubscription.paddleCustomerId}`);
                return {
                    paddleCustomerId: existingSubscription.paddleCustomerId,
                    email: customerData.email
                };
            }

            // Create new Paddle customer or find existing one
            const paddleCustomer = await this.createCustomer(customerData);
            logger.info(`Customer creation result: ${JSON.stringify(paddleCustomer)}`);
            
            if (!paddleCustomer || !paddleCustomer.id) {
                throw new Error(`Invalid customer data returned: ${JSON.stringify(paddleCustomer)}`);
            }
            
            return {
                paddleCustomerId: paddleCustomer.id,
                email: customerData.email
            };

        } catch (error) {
            logger.error('Error finding or creating customer:', error);
            throw error;
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
            const userId = subscriptionData.customer_id;
            
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
