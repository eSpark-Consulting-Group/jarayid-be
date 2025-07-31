import bcrypt from 'bcryptjs';

import { response, generateToken,generateHashedPassword } from '../utils/index.js';
import { cloudinaryService, emailService, passwordResetService, trialService } from '../services/index.js';
import winston from 'winston';
import prisma from '../prisma/index.js';


// Logger configuration
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level.toUpperCase()}] user Controller: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
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

class UserController {
    constructor() {
        this.prisma = prisma;
    }

    // User registration & social signup/login controller
    async signup(req, res) {
        const { name, email, password, loginType = 'local', socialId, image } = req.body;

        try {
            // Validate required fields based on login type
            if (loginType === 'local') {
                if (!password) {
                    return response.error(res, 'Password is required for local signup', 400);
                }
            } else {
                // For social login, socialId is required
                if (!socialId) {
                    return response.error(res, 'Social ID is required for social login', 400);
                }
            }

            // Check if user already exists by email
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                if (!existingUser.isSocialLogin) {
                    return response.error(res, 'Email is already registered', 409);
                }
                if (loginType !== 'local') {
                    // For social login, check if it's the same social provider
                    if (existingUser.loginType === loginType) {
                        const token = generateToken({ userId: existingUser.id, email: existingUser.email });
                        return response.success(res, { user: existingUser, token }, 'User logged in successfully');
                    }
                    return response.error(res, 'Email already registered with different social provider', 409);
                }
                return response.error(res, 'Email already registered via social login', 409);
            }

            // For social login, also check if socialId already exists
            if (loginType !== 'local' && socialId) {
                const existingSocialUser = await prisma.user.findFirst({
                    where: {
                        socialId: socialId,
                        loginType: loginType
                    }
                });
                
                if (existingSocialUser) {
                    const token = generateToken({ userId: existingSocialUser.id, email: existingSocialUser.email });
                    return response.success(res, { user: existingSocialUser, token }, 'User logged in successfully');
                }
            }

            let hashedPassword = null;
            let isSocialLogin = false;
            
            if (loginType === 'local') {
                hashedPassword = await generateHashedPassword(password);
            } else {
                isSocialLogin = true;
            }

            // Prepare user data
            const userData = {
                name: name || null, // Make name optional
                email,
                password: hashedPassword,
                isSocialLogin,
                loginType,
                socialId: socialId || null,
                image: image || null // Store social login image URL
            };

            const user = await prisma.user.create({
                data: userData,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    loginType: true,
                    image: true,
                    socialId: true,
                    isSocialLogin: true,
                    role: true,
                    country: true,
                    phoneNumber: true,
                    createdAt: true
                }
            });

            // Create a 7-day free trial subscription for new users
            const trialEndDate = new Date();
            trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 days from now

            const subscription = await prisma.subscription.create({
                data: {
                    userId: user.id,
                    isPremium: false,
                    status: 'TRIALING',
                    trialEndsAt: trialEndDate,
                    currentPeriodStart: new Date(),
                    currentPeriodEnd: trialEndDate,
                    metadata: {
                        trialType: 'signup_trial',
                        trialDuration: '7_days',
                        autoCreated: true
                    }
                }
            });

            logger.info('Free trial created for new user', {
                userId: user.id,
                userEmail: user.email,
                trialEndsAt: trialEndDate,
                subscriptionId: subscription.id
            });

            const token = generateToken({ userId: user.id, email: user.email });
            
            // Include trial information in the response
            const userResponse = {
                ...user,
                subscription: {
                    status: 'trial',
                    trialEndsAt: trialEndDate,
                    daysRemaining: 7
                }
            };

            return response.success(res, { user: userResponse, token }, 'User registered successfully with 7-day free trial');
        } catch (error) {
            logger.error('Signup error:', { error: error?.message || error });
            return response.error(res, 'Signup failed', 500, error.message);
        }
    }

    async login(req, res) {
        const { email, password, loginType = 'local' } = req.body;

        try {
            const user = await prisma.user.findUnique({ 
                where: { email },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    password: true,
                    loginType: true,
                    image: true,
                    socialId: true,
                    isSocialLogin: true,
                    role: true,
                    country: true,
                    phoneNumber: true,
                    isDeleted: true,
                    createdAt: true,
                    updatedAt: true
                }
            });
            
            if (!user) {
                return response.error(res, 'Invalid credentials', 401);
            }

            // Check if user account is deleted
            if (user.isDeleted) {
                return response.error(res, 'This account is not available. Please contact admin for assistance.', 403);
            }
            if(user.isBanned){
                return response.error(res, 'This account is banned. Please contact admin for assistance.', 403);
            }

            if (loginType === 'local') {
                if (user.isSocialLogin) {
                    return response.error(res, 'Use social login method', 400);
                }
                const isMatch = await bcrypt.compare(password, user.password);
                if (!isMatch) {
                    return response.error(res, 'Invalid credentials', 401);
                }
            } else {
                if (!user.isSocialLogin || user.loginType !== loginType) {
                    return response.error(res, 'Account not registered for this social provider', 400);
                }
            }
            // Update last login time
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLoginAt: new Date() }
            });
            // Remove password and isDeleted from response
            const { password: _, isDeleted: __, ...userResponse } = user;
            const token = generateToken({ userId: user.id, email: user.email });
            return response.success(res, { user: userResponse, token }, 'Logged in successfully');
        } catch (error) {
            logger.error('Login error:', { error: error?.message || error });
            return response.error(res, 'Login failed', 500, error.message);
        }
    }

    async getProfile(req, res) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    isBanned: true,
                    image: true,
                    country: true,
                    phoneNumber: true,
                    loginType: true,
                    isDeleted: true,
                    createdAt: true,
                    updatedAt: true
                }
            });
            
            if (!user) {
                return response.notFound(res, 'User not found');
            }

            // Check if user account is deleted
            if (user.isDeleted) {
                return response.error(res, 'This account is not available. Please contact admin for assistance.', 403);
            }

            // Remove isDeleted from response
            const { isDeleted: _, ...userResponse } = user;
            return response.success(res, { user: userResponse }, 'Profile fetched successfully');
        } catch (error) {
            logger.error('Get profile error:', { error: error?.message || error });
            return response.error(res, 'Failed to fetch profile', 500, error.message);
        }
    }

    async update(req, res) {
        const id = req.user.id;
        const allowedFields = ['name', 'country', 'phoneNumber'];
        const data = {};
        allowedFields.forEach((key) => {
            if (req.body[key] !== undefined) data[key] = req.body[key];
        });
        if (!req.file && Object.keys(data).length === 0) {
            return response.error(res, 'No valid fields provided for update', 400);
        }
        try {
            const existingUser = await prisma.user.findUnique({ 
                where: { id },
                select: { id: true, imageKey: true, isDeleted: true }
            });
            
            if (!existingUser) {
                return response.notFound(res, 'User not found');
            }

            // Check if user account is deleted
            if (existingUser.isDeleted) {
                return response.error(res, 'This account is not available. Please contact admin for assistance.', 403);
            }

            if (req.file) {
                if (existingUser.imageKey) {
                    try {
                        await cloudinaryService.deleteFile(existingUser.imageKey);
                    } catch (deleteError) {
                        logger.error('Failed to delete old user image from Cloudinary:', { error: deleteError?.message || deleteError });
                    }
                }
                try {
                    const imageData = await cloudinaryService.uploadImage(
                        req.file.buffer,
                        req.file.originalname,
                        'users'
                    );
                    data.image = imageData.url;
                    data.imageKey = imageData.key;
                } catch (uploadError) {
                    logger.error('User image upload error:', { error: uploadError?.message || uploadError });
                    return response.error(res, 'Failed to upload new image', 400);
                }
            }

            const user = await prisma.user.update({ where: { id }, data });
            return response.success(res, { user }, 'User updated successfully');
        } catch (error) {
            logger.error('Update user error:', { error: error?.message || error });
            if (error.code === 'P2025') {
                return response.notFound(res, 'User not found');
            }
            return response.error(res, 'User update failed', 500, error.message);
        }
    }

    async forgotPassword(req, res) {
        const { email } = req.body;

        try {
            const user = await prisma.user.findUnique({ 
                where: { email },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    isSocialLogin: true,
                    password: true,
                    isDeleted: true
                }
            });
            
            if (!user) {
                return response.success(res, null, 'If this email is registered, you will receive a password reset link');
            }

            // Check if user account is deleted
            if (user.isDeleted) {
                return response.error(res, 'This account is not available. Please contact admin for assistance.', 403);
            }

            if (user.isSocialLogin && !user.password) {
                return response.error(res, 'This account uses social login. Password reset is not available', 400);
            }

            const resetToken = passwordResetService.generateResetToken();
            const expirationTime = passwordResetService.calculateExpirationTime();
            
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    resetPasswordToken: resetToken,
                    resetPasswordExpires: expirationTime,
                },
            });

            const resetLink = passwordResetService.generateResetLink({
                userId: user.id,
                email: user.email,
                resetToken,
            });

            await emailService.sendForgotPasswordEmail({
                email: user.email,
                userName: typeof user.name === 'string' ? user.name : 'User',
                resetLink,
                expirationTime: passwordResetService.getExpirationDisplayTime(),
            });

            return response.success(res, null, 'Password reset link sent to your email');
        } catch (error) {
            logger.error('Forgot password error:', { error: error?.message || error });
            return response.error(res, 'Failed to process forgot password request', 500, error.message);
        }
    }

    async verifyResetToken(req, res) {
        const { token } = req.query;

        try {
            const decoded = passwordResetService.verifyResetJWT(token);
            const { userId, email, resetToken } = decoded;

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    resetPasswordToken: true,
                    resetPasswordExpires: true,
                    isDeleted: true,
                },
            });

            if (!user) {
                return response.error(res, 'Invalid reset token', 400);
            }

            // Check if user account is deleted
            if (user.isDeleted) {
                return response.error(res, 'This account is not available. Please contact admin for assistance.', 403);
            }

            if (user.resetPasswordToken !== resetToken) {
                return response.error(res, 'Invalid reset token', 400);
            }

            if (passwordResetService.isTokenExpired(user.resetPasswordExpires)) {
                return response.error(res, 'Reset token has expired', 400);
            }

            if (user.email !== email) {
                return response.error(res, 'Invalid reset token', 400);
            }

            return response.success(res, { valid: true }, 'Reset token is valid');
        } catch (error) {
            logger.error('Verify reset token error:', { error: error?.message || error });
            if (error.message.includes('expired') || error.message.includes('invalid')) {
                return response.error(res, error.message, 400);
            }
            return response.error(res, 'Failed to verify reset token', 500, error.message);
        }
    }

    async resetPassword(req, res) {
        const { token, newPassword } = req.body;

        try {
            const decoded = passwordResetService.verifyResetJWT(token);
            const { userId, email, resetToken } = decoded;

            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    name: true,
                    email: true,
                    resetPasswordToken: true,
                    resetPasswordExpires: true,
                    isDeleted: true,
                },
            });

            if (!user) {
                return response.error(res, 'Invalid reset token', 400);
            }

            // Check if user account is deleted
            if (user.isDeleted) {
                return response.error(res, 'This account is not available. Please contact admin for assistance.', 403);
            }

            if (user.resetPasswordToken !== resetToken) {
                return response.error(res, 'Invalid reset token', 400);
            }

            if (passwordResetService.isTokenExpired(user.resetPasswordExpires)) {
                return response.error(res, 'Reset token has expired', 400);
            }

            if (user.email !== email) {
                return response.error(res, 'Invalid reset token', 400);
            }

            // Hash new password
            const hashedPassword = await generateHashedPassword(newPassword);

            await prisma.user.update({
                where: { id: userId },
                data: {
                    password: hashedPassword,
                    resetPasswordToken: null,
                    resetPasswordExpires: null,
                },
            });

            try {
                await emailService.sendPasswordResetSuccessEmail({
                    email: user.email,
                    userName: typeof user.name === 'string' ? user.name : user.name.en || user.name.ar || 'User',
                    resetDate: new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                });
            } catch (emailError) {
                logger.error('Failed to send password reset confirmation email:', { error: emailError?.message || emailError });
            }

            return response.success(res, null, 'Password reset successfully');
        } catch (error) {
            logger.error('Reset password error:', { error: error?.message || error });
            if (error.message.includes('expired') || error.message.includes('invalid')) {
                return response.error(res, error.message, 400);
            }
            return response.error(res, 'Failed to reset password', 500, error.message);
        }
    }

    async setPassword(req, res) {
        const userId = req.user.id;
        const { currentPassword, newPassword } = req.body;

        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    password: true,
                    isSocialLogin: true,
                    name: true,
                    isDeleted: true,
                },
            });

            if (!user) {
                return response.notFound(res, 'User not found');
            }

            // Check if user account is deleted
            if (user.isDeleted) {
                return response.error(res, 'This account is not available. Please contact admin for assistance.', 403);
            }

            if (user.isSocialLogin && !user.password) {
                return response.error(res, 'Password cannot be set for social login accounts without existing password', 400);
            }

            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                return response.error(res, 'Current password is incorrect', 400);
            }

            const hashedNewPassword = await generateHashedPassword(newPassword);

            await prisma.user.update({
                where: { id: userId },
                data: { password: hashedNewPassword },
            });

            try {
                await emailService.sendPasswordResetSuccessEmail({
                    email: user.email,
                    userName: typeof user.name === 'string' ? user.name : user.name.en || user.name.ar || 'User',
                    resetDate: new Date().toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    }),
                });
            } catch (emailError) {
                logger.error('Failed to send password change confirmation email:', { error: emailError?.message || emailError });
            }

            return response.success(res, null, 'Password updated successfully');
        } catch (error) {
            logger.error('Set password error:', { error: error?.message || error });
            return response.error(res, 'Failed to update password', 500, error.message);
        }
    }

    /**
     * Get all users with pagination and search (Admin only)
     * GET /api/users/admin/users
     */
    async getAllUsers(req, res) {
        try {
            const { 
                page = 1, 
                limit = 10, 
                search, 
                role, 
                isBanned, 
                isSocialLogin,
                subscriptionStatus,
                userPaidStatus, // New filter for premium/free/trial
                sortBy = 'createdAt',
                sortOrder = 'desc',
                from,
                to
            } = req.query;

            // Build where conditions
            const where = {
                isDeleted: false // Exclude deleted users
            };

            // Date range filtering based on createdAt
            if (from || to) {
                where.createdAt = {};
                
                if (from) {
                    // Parse from date and set to start of day
                    const fromDate = new Date(from);
                    if (isNaN(fromDate.getTime())) {
                        return response.error(res, 'Invalid "from" date format. Please use YYYY-MM-DD format.', 400);
                    }
                    fromDate.setHours(0, 0, 0, 0);
                    where.createdAt.gte = fromDate;
                }
                
                if (to) {
                    // Parse to date and set to end of day
                    const toDate = new Date(to);
                    if (isNaN(toDate.getTime())) {
                        return response.error(res, 'Invalid "to" date format. Please use YYYY-MM-DD format.', 400);
                    }
                    toDate.setHours(23, 59, 59, 999);
                    where.createdAt.lte = toDate;
                }

                // Validate date range
                if (from && to) {
                    const fromDate = new Date(from);
                    const toDate = new Date(to);
                    if (fromDate > toDate) {
                        return response.error(res, '"from" date cannot be later than "to" date.', 400);
                    }
                }
            }
            
            // Search functionality
            if (search) {
                where.OR = [
                    { email: { contains: search, mode: 'insensitive' } },
                    { phoneNumber: { contains: search, mode: 'insensitive' } },
                    { country: { contains: search, mode: 'insensitive' } }
                ];

                // Handle JSON name field search
                where.OR.push({
                    name: {
                        path: ['en'],
                        string_contains: search
                    }
                });
                where.OR.push({
                    name: {
                        path: ['ar'], 
                        string_contains: search
                    }
                });
            }

            // Filter by role
            if (role) {
                where.role = role;
            }

            // Filter by ban status
            if (isBanned !== undefined) {
                where.isBanned = isBanned 
            }

            // Filter by social login
            if (isSocialLogin !== undefined) {
                where.isSocialLogin = isSocialLogin
            }

            // Build orderBy
            const orderBy = {};
            orderBy[sortBy] = sortOrder;

            // Get pagination parameters
            const skip = (parseInt(page) - 1) * parseInt(limit);
            const take = parseInt(limit);

            // Fetch users with subscription info and counts
            const [users, total] = await Promise.all([
                prisma.user.findMany({
                    where,
                    skip,
                    take,
                    orderBy,
                    include: {
                        subscriptions: {
                            orderBy: { createdAt: 'desc' },
                            take: 1
                        },
                        _count: {
                            select: {
                                articles: true,
                                comments: { where: { isDeleted: false } },
                                favorites: true,
                                readLater: true,
                                articleViews: true
                            }
                        }
                    }
                }),
                prisma.user.count({ where })
            ]);

            // Process user paid status filter after fetching
            let filteredUsers = users;
            if (userPaidStatus) {
                filteredUsers = users.filter(user => {
                    const latestSubscription = user.subscriptions[0];
                    
                    if (userPaidStatus === 'premium') {
                        return latestSubscription && latestSubscription.isPremium && latestSubscription.status === 'ACTIVE';
                    } else if (userPaidStatus === 'trial') {
                        return latestSubscription && !latestSubscription.isPremium && latestSubscription.trialEndsAt && new Date(latestSubscription.trialEndsAt) > new Date() && latestSubscription.status === 'TRIALING';
                    } else if (userPaidStatus === 'free') {
                        return !latestSubscription || (!latestSubscription.isPremium && (!latestSubscription.trialEndsAt || new Date(latestSubscription.trialEndsAt) <= new Date()));
                    }
                    return true;
                });
            }

            // Legacy support: Process subscription status filter if userPaidStatus is not provided
            if (!userPaidStatus && subscriptionStatus) {
                filteredUsers = filteredUsers.filter(user => {
                    const latestSubscription = user.subscriptions[0];
                    
                    if (subscriptionStatus === 'premium') {
                        return latestSubscription && latestSubscription.isPremium;
                    } else if (subscriptionStatus === 'trial') {
                        return latestSubscription && !latestSubscription.isPremium && latestSubscription.trialEndsAt && new Date(latestSubscription.trialEndsAt) > new Date();
                    } else if (subscriptionStatus === 'free') {
                        return !latestSubscription || (!latestSubscription.isPremium && (!latestSubscription.trialEndsAt || new Date(latestSubscription.trialEndsAt) <= new Date()));
                    }
                    return true;
                });
            }

            // Format response data
            const formattedUsers = filteredUsers.map(user => {
                const latestSubscription = user.subscriptions[0];
                let subscriptionInfo = {
                    status: 'free',
                    isPremium: false,
                    trialEndsAt: null,
                    subscriptionDate: null
                };

                if (latestSubscription) {
                    if (latestSubscription.isPremium) {
                        subscriptionInfo.status = 'premium';
                        subscriptionInfo.isPremium = true;
                    } else if (latestSubscription.trialEndsAt && new Date(latestSubscription.trialEndsAt) > new Date()) {
                        subscriptionInfo.status = 'trial';
                        subscriptionInfo.trialEndsAt = latestSubscription.trialEndsAt;
                    }
                    subscriptionInfo.subscriptionDate = latestSubscription.createdAt;
                }

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    isBanned: user.isBanned,
                    isSocialLogin: user.isSocialLogin,
                    loginType: user.loginType,
                    image: user.image,
                    country: user.country,
                    lastLoginAt: user.lastLoginAt,
                    phoneNumber: user.phoneNumber,
                    createdAt: user.createdAt,
                    updatedAt: user.updatedAt,
                    subscription: subscriptionInfo,
                    stats: {
                        articlesCreated: user._count.articles,
                        commentsCount: user._count.comments,
                        favoritesCount: user._count.favorites,
                        readLaterCount: user._count.readLater,
                        articleViewsCount: user._count.articleViews
                    }
                };
            });

            const response_data = {
                users: formattedUsers,
                pagination: {
                    total,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(total / parseInt(limit)),
                    hasNextPage: parseInt(page) < Math.ceil(total / parseInt(limit)),
                    hasPrevPage: parseInt(page) > 1
                },
                meta: {
                    totalUsers: total,
                    currentPageUsers: formattedUsers.length,
                    filters: { role, isBanned, isSocialLogin, subscriptionStatus, userPaidStatus, search, from, to }
                }
            };

            logger.info('Admin users list retrieved', { 
                adminId: req.user.id, 
                totalUsers: total, 
                page: parseInt(page),
                filters: { role, isBanned, isSocialLogin, subscriptionStatus, userPaidStatus, search, from, to }
            });

            return response.success(res, response_data, 'Users retrieved successfully');

        } catch (error) {
            logger.error('Get all users error:', { error: error.message, adminId: req.user?.id });
            return response.error(res, 'Failed to retrieve users', 500, error.message);
        }
    }

    /**
     * Get single user details with full info (Admin only)
     * GET /api/users/admin/users/:id
     */
    async getUserById(req, res) {
        try {
            const { id } = req.params;

            const user = await prisma.user.findUnique({
                where: { 
                    id,
                    isDeleted: false // Only find non-deleted users
                },
                include: {
                    subscriptions: {
                        orderBy: { createdAt: 'desc' }
                    },
                    articles: {
                        select: {
                            id: true,
                            title: true,
                            createdAt: true,
                            viewCount: true,
                            pinned: true
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    },
                    comments: {
                        where: { isDeleted: false },
                        select: {
                            id: true,
                            content: true,
                            createdAt: true,
                            article: {
                                select: {
                                    id: true,
                                    title: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    },
                    favorites: {
                        include: {
                            article: {
                                select: {
                                    id: true,
                                    title: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    },
                    readLater: {
                        include: {
                            article: {
                                select: {
                                    id: true,
                                    title: true
                                }
                            }
                        },
                        orderBy: { createdAt: 'desc' },
                        take: 10
                    },
                    _count: {
                        select: {
                            articles: true,
                            comments: { where: { isDeleted: false } },
                            favorites: true,
                            readLater: true,
                            articleViews: true
                        }
                    }
                }
            });

            if (!user) {
                return response.notFound(res, 'User not found');
            }

            // Format subscription info
            const latestSubscription = user.subscriptions[0];
            let subscriptionInfo = {
                status: 'free',
                isPremium: false,
                trialEndsAt: null,
                history: user.subscriptions
            };

            if (latestSubscription) {
                if (latestSubscription.isPremium) {
                    subscriptionInfo.status = 'premium';
                    subscriptionInfo.isPremium = true;
                } else if (latestSubscription.trialEndsAt && new Date(latestSubscription.trialEndsAt) > new Date()) {
                    subscriptionInfo.status = 'trial';
                    subscriptionInfo.trialEndsAt = latestSubscription.trialEndsAt;
                }
            }

            const userData = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                isBanned: user.isBanned,
                isSocialLogin: user.isSocialLogin,
                loginType: user.loginType,
                socialId: user.socialId,
                image: user.image,
                imageKey: user.imageKey,
                country: user.country,
                phoneNumber: user.phoneNumber,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                subscription: subscriptionInfo,
                recentActivity: {
                    articles: user.articles,
                    comments: user.comments,
                    favorites: user.favorites,
                    readLater: user.readLater
                },
                stats: {
                    articlesCreated: user._count.articles,
                    commentsCount: user._count.comments,
                    favoritesCount: user._count.favorites,
                    readLaterCount: user._count.readLater,
                    articleViewsCount: user._count.articleViews
                }
            };

            logger.info('Admin user details retrieved', { 
                adminId: req.user.id, 
                targetUserId: id 
            });

            return response.success(res, { user: userData }, 'User details retrieved successfully');

        } catch (error) {
            logger.error('Get user by ID error:', { error: error.message, adminId: req.user?.id, targetUserId: req.params.id });
            return response.error(res, 'Failed to retrieve user details', 500, error.message);
        }
    }

    /**
     * Toggle user ban status (Admin only)
     * PATCH /api/users/admin/users/:id/toggle-ban
     */
    async toggleUserBan(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const user = await prisma.user.findUnique({
                where: { 
                    id,
                    isDeleted: false // Only find non-deleted users for ban toggle
                },
                select: { id: true, email: true, name: true, isBanned: true, role: true }
            });

            if (!user) {
                return response.notFound(res, 'User not found or account is deleted');
            }

            // Prevent banning other admins
            if (user.role === 'ADMIN') {
                return response.error(res, 'Cannot ban other administrators', 403);
            }

            // Prevent self-banning
            if (user.id === req.user.id) {
                return response.error(res, 'Cannot ban yourself', 403);
            }

            const newBanStatus = !user.isBanned;

            const updatedUser = await prisma.user.update({
                where: { id },
                data: { isBanned: newBanStatus },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    isBanned: true,
                    role: true,
                    createdAt: true
                }
            });

            const action = newBanStatus ? 'banned' : 'unbanned';
            const message = `User ${action} successfully`;

            logger.info(`User ${action}`, {
                adminId: req.user.id,
                adminEmail: req.user.email,
                targetUserId: id,
                targetUserEmail: user.email,
                action,
                reason: reason || 'No reason provided'
            });

            // Here you could add email notification to the user about ban/unban
            try {
                if (newBanStatus) {
                    // Send ban notification email
                    // await emailService.sendBanNotificationEmail(user.email, reason);
                } else {
                    // Send unban notification email
                    // await emailService.sendUnbanNotificationEmail(user.email);
                }
            } catch (emailError) {
                logger.error('Failed to send ban/unban notification email:', { 
                    error: emailError.message,
                    userEmail: user.email,
                    action
                });
            }

            return response.success(res, { 
                user: updatedUser,
                action,
                reason: reason || null
            }, message);

        } catch (error) {
            logger.error('Toggle user ban error:', { 
                error: error.message, 
                adminId: req.user?.id, 
                targetUserId: req.params.id 
            });
            return response.error(res, 'Failed to update user ban status', 500, error.message);
        }
    }

    /**
     * Get user statistics dashboard (Admin only)
     * GET /api/users/admin/stats
     */
    async getUserStats(req, res) {
        try {
            const { period = '30d' } = req.query;

            // Calculate date range
            let dateFilter = {};
            if (period !== 'all') {
                const days = parseInt(period.replace('d', ''));
                const startDate = new Date();
                startDate.setDate(startDate.getDate() - days);
                dateFilter = { gte: startDate };
            }

            const [
                totalUsers,
                nonBannedUsers,
                bannedUsers,
                adminUsers,
                socialLoginUsers,
                premiumUsers,
                trialUsers,
                newUsersInPeriod,
                usersByCountry,
                subscriptionStats,
                totalArticleViews,
                guestViews,
                registeredUserViews,
                activeViewers
            ] = await Promise.all([
                // Total users (excluding deleted)
                prisma.user.count({ where: { isDeleted: false } }),
                
                // Non-banned users (excluding deleted)
                prisma.user.count({ where: { isBanned: false, isDeleted: false } }),
                
                // Banned users (excluding deleted)
                prisma.user.count({ where: { isBanned: true, isDeleted: false } }),
                
                // Admin users (excluding deleted)
                prisma.user.count({ where: { role: 'ADMIN', isDeleted: false } }),
                
                // Social login users (excluding deleted)
                prisma.user.count({ where: { isSocialLogin: true, isDeleted: false } }),
                
                // Premium users (active subscriptions, excluding deleted)
                prisma.subscription.count({ 
                    where: { 
                        isPremium: true,
                        status: 'ACTIVE',
                        user: { isBanned: false, isDeleted: false }
                    } 
                }),
                
                // Trial users (active trials, excluding deleted)
                prisma.subscription.count({ 
                    where: { 
                        isPremium: false,
                        trialEndsAt: { gt: new Date() },
                        status: 'TRIALING',
                        user: { isBanned: false, isDeleted: false }
                    } 
                }),
                
                // New users in period (excluding deleted)
                prisma.user.count({
                    where: period !== 'all' ? { 
                        createdAt: dateFilter,
                        isDeleted: false 
                    } : { isDeleted: false }
                }),
                
                // Users by country (top 10, excluding deleted)
                prisma.user.groupBy({
                    by: ['country'],
                    _count: { country: true },
                    where: { 
                        country: { not: null },
                        isBanned: false,
                        isDeleted: false
                    },
                    orderBy: { _count: { country: 'desc' } },
                    take: 10
                }),
                
                // Subscription statistics (excluding deleted users)
                prisma.subscription.groupBy({
                    by: ['isPremium'],
                    _count: { isPremium: true },
                    where: {
                        user: { isBanned: false, isDeleted: false }
                    }
                }),

                // Total article views (all time or filtered by period)
                prisma.articleView.count({
                    where: period !== 'all' ? { viewedAt: dateFilter } : {}
                }),

                // Guest views (views without userId - anonymous users)
                prisma.articleView.count({
                    where: {
                        userId: null,
                        ...(period !== 'all' ? { viewedAt: dateFilter } : {})
                    }
                }),

                // Registered user views
                prisma.articleView.count({
                    where: {
                        userId: { not: null },
                        ...(period !== 'all' ? { viewedAt: dateFilter } : {})
                    }
                }),

                // Active users (users who have viewed articles in the period, excluding deleted)
                prisma.user.count({
                    where: {
                        isBanned: false,
                        isDeleted: false,
                        articleViews: {
                            some: period !== 'all' ? { viewedAt: dateFilter } : {}
                        }
                    }
                })
            ]);

            // Get daily user registrations for chart (excluding deleted users)
            const dailyRegistrations = await prisma.$queryRaw`
                SELECT 
                    DATE("createdAt") as date,
                    COUNT(*) as count
                FROM users 
                WHERE "createdAt" >= ${new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)}
                    AND "isDeleted" = false
                GROUP BY DATE("createdAt")
                ORDER BY date DESC
                LIMIT 30
            `;

            // Get top active users (excluding deleted)
            const topActiveUsers = await prisma.user.findMany({
                where: { 
                    isBanned: false,
                    isDeleted: false 
                },
                include: {
                    _count: {
                        select: {
                            articles: true,
                            comments: { where: { isDeleted: false } },
                            favorites: true,
                            articleViews: true
                        }
                    }
                },
                orderBy: [
                    { comments: { _count: 'desc' } },
                    { favorites: { _count: 'desc' } }
                ],
                take: 10
            });

            const freeUsers = nonBannedUsers - premiumUsers - trialUsers;
            
            // Calculate percentages
            const premiumPercentage = totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(2) : 0;
            const activeUsersPercentage = totalUsers > 0 ? ((activeViewers / totalUsers) * 100).toFixed(2) : 0;
            const guestViewsPercentage = totalArticleViews > 0 ? ((guestViews / totalArticleViews) * 100).toFixed(2) : 0;
            const registeredViewsPercentage = totalArticleViews > 0 ? ((registeredUserViews / totalArticleViews) * 100).toFixed(2) : 0;
            const conversionRate = totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(2) : 0;

            const stats = {
                overview: {
                    totalUsers,
                    activeUsers: nonBannedUsers,
                    bannedUsers,
                    adminUsers,
                    newUsersInPeriod,
                    socialLoginUsers,
                    conversionRate: `${conversionRate}%`
                },
                subscriptions: {
                    premium: premiumUsers,
                    trial: trialUsers,
                    free: freeUsers,
                    premiumPercentage: `${premiumPercentage}%`,
                    breakdown: {
                        premiumUsers: {
                            count: premiumUsers,
                            percentage: `${premiumPercentage}%`
                        },
                        trialUsers: {
                            count: trialUsers,
                            percentage: totalUsers > 0 ? `${((trialUsers / totalUsers) * 100).toFixed(2)}%` : '0.00%'
                        },
                        freeUsers: {
                            count: freeUsers,
                            percentage: totalUsers > 0 ? `${((freeUsers / totalUsers) * 100).toFixed(2)}%` : '0.00%'
                        }
                    }
                },
                userEngagement: {
                    activeViewers: {
                        count: activeViewers,
                        percentage: `${activeUsersPercentage}%`,
                        description: "Users who have viewed articles in the selected period"
                    },
                    totalRegisteredUsers: {
                        count: nonBannedUsers,
                        percentage: "100.00%",
                        description: "Active (non-banned) registered users"
                    }
                },
                articleViews: {
                    total: totalArticleViews,
                    guestViews: {
                        count: guestViews,
                        percentage: `${guestViewsPercentage}%`,
                        description: "Views from anonymous/guest users"
                    },
                    registeredUserViews: {
                        count: registeredUserViews,
                        percentage: `${registeredViewsPercentage}%`,
                        description: "Views from registered users"
                    },
                    breakdown: {
                        guest: guestViews,
                        registered: registeredUserViews,
                        guestPercentage: `${guestViewsPercentage}%`,
                        registeredPercentage: `${registeredViewsPercentage}%`
                    }
                },
                geography: usersByCountry.map(item => ({
                    country: item.country || 'Unknown',
                    count: item._count.country
                })),
                activity: {
                    dailyRegistrations: dailyRegistrations.map(row => ({
                        date: row.date,
                        count: Number(row.count)
                    })),
                    topActiveUsers: topActiveUsers.map(user => ({
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        stats: {
                            articles: user._count.articles,
                            comments: user._count.comments,
                            favorites: user._count.favorites,
                            views: user._count.articleViews
                        }
                    }))
                },
                period,
                summary: {
                    totalUsers,
                    premiumUsers,
                    activeViewers,
                    totalViews: totalArticleViews,
                    guestViews,
                    keyMetrics: {
                        premiumConversion: `${premiumPercentage}%`,
                        userEngagement: `${activeUsersPercentage}%`,
                        guestTraffic: `${guestViewsPercentage}%`
                    }
                }
            };

            logger.info('User statistics retrieved', { 
                adminId: req.user.id,
                period,
                totalUsers
            });

            return response.success(res, stats, 'User statistics retrieved successfully');

        } catch (error) {
            logger.error('Get user stats error:', { error: error.message, adminId: req.user?.id });
            return response.error(res, 'Failed to retrieve user statistics', 500, error.message);
        }
    }

    /**
     * Bulk delete users by setting isDeleted to true (Admin only)
     * DELETE /api/users/admin/users/bulk-delete
     */
    async bulkDeleteUsers(req, res) {
        try {
            const { userIds, reason } = req.body;

            // Validation
            if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
                return response.error(res, 'userIds array is required and cannot be empty', 400);
            }

            if (userIds.length > 100) {
                return response.error(res, 'Cannot delete more than 100 users at once', 400);
            }

            // Validate all userIds are valid UUIDs
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            for (const userId of userIds) {
                if (!uuidRegex.test(userId)) {
                    return response.error(res, `Invalid user ID format: ${userId}`, 400);
                }
            }

            // Prevent self-deletion
            if (userIds.includes(req.user.id)) {
                return response.error(res, 'Cannot delete your own account', 403);
            }

            // Get users to be deleted for validation and logging
            const usersToDelete = await prisma.user.findMany({
                where: {
                    id: { in: userIds }
                },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    isDeleted: true
                }
            });

            if (usersToDelete.length === 0) {
                return response.error(res, 'No valid users found for the provided IDs', 404);
            }

            // Check if any users are admins
            const adminUsers = usersToDelete.filter(user => user.role === 'ADMIN');
            if (adminUsers.length > 0) {
                return response.error(res, 
                    `Cannot delete admin users: ${adminUsers.map(u => u.email).join(', ')}`, 
                    403
                );
            }

            // Check which users are already deleted
            const alreadyDeleted = usersToDelete.filter(user => user.isDeleted);
            const usersToUpdate = usersToDelete.filter(user => !user.isDeleted);

            let updatedCount = 0;
            if (usersToUpdate.length > 0) {
                // Perform bulk soft delete (set isDeleted = true)
                const updateResult = await prisma.user.updateMany({
                    where: {
                        id: { in: usersToUpdate.map(u => u.id) },
                        isDeleted: false // Only update users that aren't already deleted
                    },
                    data: {
                        isDeleted: true,
                        updatedAt: new Date()
                    }
                });

                updatedCount = updateResult.count;
            }

            // Log the bulk deletion action
            logger.info('Bulk user deletion performed', {
                adminId: req.user.id,
                adminEmail: req.user.email,
                totalRequested: userIds.length,
                totalFound: usersToDelete.length,
                totalUpdated: updatedCount,
                alreadyDeleted: alreadyDeleted.length,
                adminUsersSkipped: adminUsers.length,
                reason: reason || 'No reason provided',
                deletedUsers: usersToUpdate.map(u => ({
                    id: u.id,
                    email: u.email
                }))
            });

            // Prepare response data
            const responseData = {
                summary: {
                    totalRequested: userIds.length,
                    totalFound: usersToDelete.length,
                    totalDeleted: updatedCount,
                    alreadyDeleted: alreadyDeleted.length,
                    adminUsersSkipped: adminUsers.length
                },
                deletedUsers: usersToUpdate.map(user => ({
                    id: user.id,
                    email: user.email,
                    name: user.name
                })),
                skippedUsers: {
                    alreadyDeleted: alreadyDeleted.map(user => ({
                        id: user.id,
                        email: user.email,
                        reason: 'Already deleted'
                    })),
                    adminUsers: adminUsers.map(user => ({
                        id: user.id,
                        email: user.email,
                        reason: 'Cannot delete admin users'
                    }))
                },
                reason: reason || null
            };

            const message = updatedCount > 0 
                ? `Successfully deleted ${updatedCount} user(s)`
                : 'No users were deleted (all were already deleted or are admin users)';

            return response.success(res, responseData, message);

        } catch (error) {
            logger.error('Bulk delete users error:', { 
                error: error.message, 
                adminId: req.user?.id,
                requestBody: req.body
            });
            return response.error(res, 'Failed to delete users', 500, error.message);
        }
    }

    /**
     * Get trial status for current user
     * GET /api/users/trial/status
     */
    async getTrialStatus(req, res) {
        try {
            const userId = req.user.id;
            const trialStatus = await trialService.getUserTrialStatus(userId);

            return response.success(res, trialStatus, 'Trial status retrieved successfully');

        } catch (error) {
            logger.error('Get trial status error:', { 
                error: error.message, 
                userId: req.user?.id 
            });
            return response.error(res, 'Failed to retrieve trial status', 500, error.message);
        }
    }

    /**
     * Admin: Check and expire trials manually
     * POST /api/users/admin/trials/check-expiration
     */
    async checkTrialExpiration(req, res) {
        try {
            const result = await trialService.checkAndExpireTrials();

            logger.info('Manual trial expiration check performed', {
                adminId: req.user.id,
                adminEmail: req.user.email,
                expiredCount: result.expiredCount
            });

            return response.success(res, result, `Processed ${result.expiredCount} expired trials`);

        } catch (error) {
            logger.error('Manual trial expiration check error:', { 
                error: error.message, 
                adminId: req.user?.id 
            });
            return response.error(res, 'Failed to check trial expiration', 500, error.message);
        }
    }

    /**
     * Admin: Extend user trial
     * POST /api/users/admin/trials/:userId/extend
     */
    async extendUserTrial(req, res) {
        try {
            const { userId } = req.params;
            const { additionalDays } = req.body;

            if (!additionalDays || additionalDays < 1 || additionalDays > 30) {
                return response.error(res, 'additionalDays must be between 1 and 30', 400);
            }

            const updatedSubscription = await trialService.extendTrial(userId, additionalDays);

            logger.info('Trial extended by admin', {
                adminId: req.user.id,
                adminEmail: req.user.email,
                targetUserId: userId,
                additionalDays
            });

            return response.success(res, {
                subscription: updatedSubscription,
                message: `Trial extended by ${additionalDays} days`
            }, 'Trial extended successfully');

        } catch (error) {
            logger.error('Extend trial error:', { 
                error: error.message, 
                adminId: req.user?.id,
                targetUserId: req.params.userId 
            });
            return response.error(res, 'Failed to extend trial', 500, error.message);
        }
    }

    /**
     * Admin: Get trial statistics
     * GET /api/users/admin/trials/stats
     */
    async getTrialStats(req, res) {
        try {
            const stats = await trialService.getTrialStats();

            return response.success(res, stats, 'Trial statistics retrieved successfully');

        } catch (error) {
            logger.error('Get trial stats error:', { 
                error: error.message, 
                adminId: req.user?.id 
            });
            return response.error(res, 'Failed to retrieve trial statistics', 500, error.message);
        }
    }

    /**
     * Admin: Get trials expiring soon
     * GET /api/users/admin/trials/expiring
     */
    async getTrialsExpiringSoon(req, res) {
        try {
            const { days = 1 } = req.query;
            const daysAhead = Math.min(Math.max(parseInt(days), 1), 7); // Between 1-7 days

            const expiringSoon = await trialService.getTrialsExpiringSoon(daysAhead);

            return response.success(res, {
                trials: expiringSoon,
                count: expiringSoon.length,
                daysAhead
            }, `Found ${expiringSoon.length} trials expiring in ${daysAhead} day(s)`);

        } catch (error) {
            logger.error('Get trials expiring soon error:', { 
                error: error.message, 
                adminId: req.user?.id 
            });
            return response.error(res, 'Failed to retrieve expiring trials', 500, error.message);
        }
    }
}

export default UserController;
