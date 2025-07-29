const prisma = require('../prisma');
const { errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Middleware to check if user has premium access
 */
const requirePremium = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Get user's subscription
        const subscription = await prisma.subscription.findFirst({
            where: { 
                userId,
                status: { in: ['ACTIVE', 'TRIALING'] },
                isPremium: true
            }
        });

        if (!subscription) {
            return errorResponse(res, 'Premium subscription required to access this feature', 403, {
                requiresPremium: true,
                upgradeUrl: '/api/subscriptions/plans'
            });
        }

        // Check if subscription is still valid
        if (subscription.currentPeriodEnd && new Date() > subscription.currentPeriodEnd) {
            // Update subscription status if expired
            await prisma.subscription.update({
                where: { id: subscription.id },
                data: { 
                    status: 'EXPIRED',
                    isPremium: false
                }
            });

            return errorResponse(res, 'Subscription has expired. Please renew to continue', 403, {
                requiresPremium: true,
                subscriptionExpired: true,
                upgradeUrl: '/api/subscriptions/plans'
            });
        }

        // Add subscription info to request
        req.subscription = subscription;
        next();

    } catch (error) {
        logger.error('Error checking premium access:', error);
        return errorResponse(res, 'Error verifying subscription status', 500);
    }
};

/**
 * Middleware to optionally check premium status (doesn't block access)
 */
const checkPremiumStatus = async (req, res, next) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            req.isPremium = false;
            return next();
        }

        // Get user's subscription
        const subscription = await prisma.subscription.findFirst({
            where: { 
                userId,
                status: { in: ['ACTIVE', 'TRIALING'] },
                isPremium: true
            }
        });

        req.isPremium = !!subscription;
        req.subscription = subscription;
        next();

    } catch (error) {
        logger.error('Error checking premium status:', error);
        req.isPremium = false;
        next();
    }
};

/**
 * Middleware to check if user has trial access
 */
const requireTrialOrPremium = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Check for active subscription or trial
        const subscription = await prisma.subscription.findFirst({
            where: { 
                userId,
                OR: [
                    { status: 'ACTIVE', isPremium: true },
                    { status: 'TRIALING' }
                ]
            }
        });

        if (subscription) {
            req.subscription = subscription;
            return next();
        }

        // Check if user is eligible for trial
        const existingSubscriptions = await prisma.subscription.count({
            where: { userId }
        });

        if (existingSubscriptions === 0) {
            // User is eligible for trial - you might want to create a trial subscription here
            req.isTrialEligible = true;
            return next();
        }

        return errorResponse(res, 'Premium subscription or trial required', 403, {
            requiresPremium: true,
            trialUsed: true,
            upgradeUrl: '/api/subscriptions/plans'
        });

    } catch (error) {
        logger.error('Error checking trial/premium access:', error);
        return errorResponse(res, 'Error verifying subscription status', 500);
    }
};

module.exports = {
    requirePremium,
    checkPremiumStatus,
    requireTrialOrPremium
};
