import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

import { response, generateToken,generateHashedPassword } from '../utils/index.js';
import { cloudinaryService, emailService, passwordResetService } from '../services/index.js';
import winston from 'winston';


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

const prisma = new PrismaClient();


class UserController {
    constructor() {
        this.prisma = prisma;
    }

    // User registration & social signup/login controller
    async signup(req, res) {
        const { name, email, password, loginType = 'local' } = req.body;

        try {
            // Check if user already exists
            const existingUser = await prisma.user.findUnique({ where: { email } });
            if (existingUser) {
                if (!existingUser.isSocialLogin) {
                    return response.error(res, 'Email is already registered', 409);
                }
                if (loginType !== 'local') {
                    if (!existingUser.image || existingUser.password) {
                        return response.error(res, 'Email already registered', 409);
                    }
                    const token = generateToken({ userId: existingUser.id, email: existingUser.email });
                    return response.success(res, { user: existingUser, token }, 'User Socially logged in successfully');
                }
                return response.error(res, 'Email already registered via social login', 409);
            }

            let hashedPassword = null;
            let isSocialLogin = false;
            if (loginType === 'local') {
                hashedPassword = await generateHashedPassword(password);
            } else {
                isSocialLogin = true;
            }

            const user = await prisma.user.create({
                data: { name, email, password: hashedPassword, isSocialLogin, loginType }
            });

            const token = generateToken({ userId: user.id, email: user.email });
            return response.success(res, { user: { id: user.id, name: user.name, email: user.email, loginType: user.loginType }, token }, 'User registered successfully');
        } catch (error) {
            logger.error('Signup error:', { error: error?.message || error });
            return response.error(res, 'Signup failed', 500, error.message);
        }
    }

    async login(req, res) {
        const { email, password, loginType = 'local' } = req.body;

        try {
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
                return response.error(res, 'Invalid credentials', 401);
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

            const token = generateToken({ userId: user.id, email: user.email });
            return response.success(res, { user, token }, 'Logged in successfully');
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
                    loginType: true,
                    createdAt: true,
                    updatedAt: true
                }
            });
            if (!user) {
                return response.notFound(res, 'User not found');
            }
            return response.success(res, { user }, 'Profile fetched successfully');
        } catch (error) {
            logger.error('Get profile error:', { error: error?.message || error });
            return response.error(res, 'Failed to fetch profile', 500, error.message);
        }
    }

    async update(req, res) {
        const id = req.user.id;
        const allowedFields = ['name', 'country'];
        const data = {};
        allowedFields.forEach((key) => {
            if (req.body[key] !== undefined) data[key] = req.body[key];
        });
        if (!req.file && Object.keys(data).length === 0) {
            return response.error(res, 'No valid fields provided for update', 400);
        }
        try {
            const existingUser = await prisma.user.findUnique({ where: { id } });
            if (!existingUser) {
                return response.notFound(res, 'User not found');
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
            const user = await prisma.user.findUnique({ where: { email } });
            if (!user) {
                return response.success(res, null, 'If this email is registered, you will receive a password reset link');
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
                userName: typeof user.name === 'string' ? user.name : user.name.en || user.name.ar || 'User',
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
                },
            });

            if (!user) {
                return response.error(res, 'Invalid reset token', 400);
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
                },
            });

            if (!user) {
                return response.error(res, 'Invalid reset token', 400);
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
                },
            });

            if (!user) {
                return response.notFound(res, 'User not found');
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
}

export default UserController;
