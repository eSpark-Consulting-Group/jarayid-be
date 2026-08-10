import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { PASSWORD_RESET_CONFIG } from '../config/config.js';

class PasswordResetService {
    /**
     * Generate a secure reset token
     * @returns {string} - Secure random token
     */
    generateResetToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Generate JWT token for password reset
     * @param {Object} payload - Payload to encode in JWT
     * @param {string} payload.userId - User ID
     * @param {string} payload.email - User email
     * @param {string} payload.resetToken - Reset token
     * @returns {string} - JWT token
     */
    generateResetJWT(payload) {
        return jwt.sign(payload, PASSWORD_RESET_CONFIG.secret, {
            expiresIn: PASSWORD_RESET_CONFIG.expirationTime,
        });
    }

    /**
     * Verify and decode JWT token
     * @param {string} token - JWT token to verify
     * @returns {Object} - Decoded payload
     * @throws {Error} - If token is invalid or expired
     */
    verifyResetJWT(token) {
        try {
            return jwt.verify(token, PASSWORD_RESET_CONFIG.secret);
        } catch (error) {
            if (error.name === 'TokenExpiredError') {
                throw new Error('Password reset link has expired');
            } else if (error.name === 'JsonWebTokenError') {
                throw new Error('Invalid password reset link');
            } else {
                throw new Error('Failed to verify password reset token');
            }
        }
    }

    /**
     * Generate password reset link
     * @param {Object} params - Parameters for reset link
     * @param {string} params.userId - User ID
     * @param {string} params.email - User email
     * @param {string} params.resetToken - Reset token
     * @returns {string} - Complete reset link
     */
    generateResetLink({ userId, email, resetToken }) {
        const jwt = this.generateResetJWT({ userId, email, resetToken });
        return `${PASSWORD_RESET_CONFIG.frontendUrl}/reset-password?token=${jwt}`;
    }

    /**
     * Calculate token expiration time
     * @param {string} expirationTime - Expiration time (e.g., "1h", "30m")
     * @returns {Date} - Expiration date
     */
    calculateExpirationTime(expirationTime = PASSWORD_RESET_CONFIG.expirationTime) {
        const now = new Date();
        
        // Parse expiration time (e.g., "1h", "30m", "2d")
        const timeValue = parseInt(expirationTime);
        const timeUnit = expirationTime.slice(-1);
        
        let milliseconds = 0;
        switch (timeUnit) {
            case 'm': // minutes
                milliseconds = timeValue * 60 * 1000;
                break;
            case 'h': // hours
                milliseconds = timeValue * 60 * 60 * 1000;
                break;
            case 'd': // days
                milliseconds = timeValue * 24 * 60 * 60 * 1000;
                break;
            default: // default to hours if no unit specified
                milliseconds = timeValue * 60 * 60 * 1000;
        }
        
        return new Date(now.getTime() + milliseconds);
    }

    /**
     * Get human-readable expiration time
     * @param {string} expirationTime - Expiration time (e.g., "1h", "30m")
     * @returns {string} - Human readable time
     */
    getExpirationDisplayTime(expirationTime = PASSWORD_RESET_CONFIG.expirationTime) {
        const timeValue = parseInt(expirationTime);
        const timeUnit = expirationTime.slice(-1);
        
        switch (timeUnit) {
            case 'm':
                return `${timeValue} minute${timeValue > 1 ? 's' : ''}`;
            case 'h':
                return `${timeValue} hour${timeValue > 1 ? 's' : ''}`;
            case 'd':
                return `${timeValue} day${timeValue > 1 ? 's' : ''}`;
            default:
                return `${timeValue} hour${timeValue > 1 ? 's' : ''}`;
        }
    }

    /**
     * Check if reset token is expired
     * @param {Date} expirationDate - Token expiration date
     * @returns {boolean} - True if expired
     */
    isTokenExpired(expirationDate) {
        return new Date() > new Date(expirationDate);
    }
}

export default new PasswordResetService();
