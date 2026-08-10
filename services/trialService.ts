import prisma from '../prisma/index.js';
import winston from 'winston';

// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] Trial Service: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

class TrialService {
    /**
     * Check and expire trials that have passed their end date
     */
    static async checkAndExpireTrials() {
        try {
            const now = new Date();
            
            // Find all active trials that have expired
            const expiredTrials = await prisma.subscription.findMany({
                where: {
                    status: 'TRIALING',
                    trialEndsAt: {
                        lte: now // Trial end date is less than or equal to now
                    }
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true
                        }
                    }
                }
            });

            if (expiredTrials.length === 0) {
                logger.info('No expired trials found');
                return { expiredCount: 0, expired: [] };
            }

            const expiredResults = [];

            // Update each expired trial
            for (const trial of expiredTrials) {
                try {
                    const updatedSubscription = await prisma.subscription.update({
                        where: { id: trial.id },
                        data: {
                            status: 'EXPIRED',
                            currentPeriodEnd: now,
                            metadata: {
                                ...trial.metadata,
                                expiredAt: now,
                                expiredReason: 'trial_period_ended'
                            }
                        }
                    });

                    expiredResults.push({
                        subscriptionId: trial.id,
                        userId: trial.userId,
                        userEmail: trial.user.email,
                        trialEndsAt: trial.trialEndsAt,
                        expiredAt: now
                    });

                    logger.info('Trial expired for user', {
                        subscriptionId: trial.id,
                        userId: trial.userId,
                        userEmail: trial.user.email,
                        trialEndsAt: trial.trialEndsAt
                    });

                    // Here you could send trial expiration notification emails
                    // await emailService.sendTrialExpirationEmail(trial.user.email, trial.user.name);

                } catch (updateError) {
                    logger.error('Failed to expire trial for subscription', {
                        subscriptionId: trial.id,
                        userId: trial.userId,
                        error: updateError.message
                    });
                }
            }

            logger.info('Trial expiration check completed', {
                totalExpired: expiredResults.length,
                processedAt: now
            });

            return {
                expiredCount: expiredResults.length,
                expired: expiredResults
            };

        } catch (error) {
            logger.error('Error checking and expiring trials:', { error: error.message });
            throw error;
        }
    }

    /**
     * Get trial status for a user
     */
    static async getUserTrialStatus(userId) {
        try {
            const subscription = await prisma.subscription.findFirst({
                where: {
                    userId,
                    OR: [
                        { status: 'TRIALING' },
                        { status: 'EXPIRED' }
                    ]
                },
                orderBy: { createdAt: 'desc' }
            });

            if (!subscription) {
                return {
                    hasTrialHistory: false,
                    currentStatus: 'no_trial'
                };
            }

            const now = new Date();
            let status = 'expired';
            let daysRemaining = 0;

            if (subscription.status === 'TRIALING' && subscription.trialEndsAt > now) {
                status = 'active';
                const timeDiff = subscription.trialEndsAt.getTime() - now.getTime();
                daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));
            }

            return {
                hasTrialHistory: true,
                currentStatus: status,
                trialEndsAt: subscription.trialEndsAt,
                daysRemaining,
                subscriptionId: subscription.id
            };

        } catch (error) {
            logger.error('Error getting user trial status:', { userId, error: error.message });
            throw error;
        }
    }

    /**
     * Get all trials expiring soon (within specified days)
     */
    static async getTrialsExpiringSoon(daysAhead = 1) {
        try {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + daysAhead);

            const expiringSoon = await prisma.subscription.findMany({
                where: {
                    status: 'TRIALING',
                    trialEndsAt: {
                        gte: new Date(),
                        lte: futureDate
                    }
                },
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            name: true
                        }
                    }
                }
            });

            return expiringSoon.map(trial => ({
                subscriptionId: trial.id,
                userId: trial.userId,
                userEmail: trial.user.email,
                userName: trial.user.name,
                trialEndsAt: trial.trialEndsAt,
                daysRemaining: Math.ceil((trial.trialEndsAt.getTime() - new Date().getTime()) / (1000 * 3600 * 24))
            }));

        } catch (error) {
            logger.error('Error getting trials expiring soon:', { error: error.message });
            throw error;
        }
    }

    /**
     * Manually extend a user's trial (admin function)
     */
    static async extendTrial(userId, additionalDays) {
        try {
            const subscription = await prisma.subscription.findFirst({
                where: {
                    userId,
                    status: 'TRIALING'
                }
            });

            if (!subscription) {
                throw new Error('No active trial found for user');
            }

            const newTrialEndDate = new Date(subscription.trialEndsAt);
            newTrialEndDate.setDate(newTrialEndDate.getDate() + additionalDays);

            const updatedSubscription = await prisma.subscription.update({
                where: { id: subscription.id },
                data: {
                    trialEndsAt: newTrialEndDate,
                    currentPeriodEnd: newTrialEndDate,
                    metadata: {
                        ...subscription.metadata,
                        extendedAt: new Date(),
                        additionalDays,
                        extendedBy: 'admin'
                    }
                }
            });

            logger.info('Trial extended for user', {
                userId,
                subscriptionId: subscription.id,
                additionalDays,
                newTrialEndDate
            });

            return updatedSubscription;

        } catch (error) {
            logger.error('Error extending trial:', { userId, additionalDays, error: error.message });
            throw error;
        }
    }

    /**
     * Get trial statistics
     */
    static async getTrialStats() {
        try {
            const [activeTrials, expiredTrials, totalTrialsCreated] = await Promise.all([
                prisma.subscription.count({
                    where: {
                        status: 'TRIALING',
                        trialEndsAt: { gt: new Date() }
                    }
                }),
                prisma.subscription.count({
                    where: {
                        status: 'EXPIRED'
                    }
                }),
                prisma.subscription.count({
                    where: {
                        trialEndsAt: { not: null }
                    }
                })
            ]);

            // Get trial conversion rate (users who upgraded to premium after trial)
            const convertedUsers = await prisma.subscription.count({
                where: {
                    isPremium: true,
                    user: {
                        subscriptions: {
                            some: {
                                status: 'EXPIRED',
                                trialEndsAt: { not: null }
                            }
                        }
                    }
                }
            });

            const conversionRate = totalTrialsCreated > 0 ? 
                ((convertedUsers / totalTrialsCreated) * 100).toFixed(2) : 0;

            return {
                activeTrials,
                expiredTrials,
                totalTrialsCreated,
                convertedUsers,
                conversionRate: `${conversionRate}%`
            };

        } catch (error) {
            logger.error('Error getting trial statistics:', { error: error.message });
            throw error;
        }
    }
}

export default TrialService;
