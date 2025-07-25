import jwt from 'jsonwebtoken';
import { configs } from '../config/config.js';
import { PrismaClient } from '@prisma/client';
import response from '../utils/response.js';
const prisma = new PrismaClient();

// Verify JWT token and attach user to req
const jwtGuard = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return response.unauthorized(res, 'No token provided');
        }

        try {
            const decoded = jwt.verify(token, configs.JWT_SECRET_KEY);
            const user = await prisma.user.findUnique({
                where: { id: decoded.userId }
            });

            if (!user) {
                return response.unauthorized(res, 'User not found');
            }

            req.user = user;
            next();
        } catch (error) {
            return response.unauthorized(res, 'Invalid token');
        }
    } catch (error) {
        response.error(res, 'Authentication error', 500);
    }
};

const roleGuard = (roles = []) => (req, res, next) => {
    if (!req.user) {
        return response.unauthorized(res, 'Authentication required');
    }
    if (roles.length === 0 || roles.includes(req.user.role)) {
        return next();
    }
    return response.error(res, 'Access denied - Insufficient permissions', 403);
};

export default {
    jwtGuard,
    roleGuard
};

export const auth = jwtGuard;
export const adminAuth = roleGuard(['ADMIN']);
export const userAuth = roleGuard(['USER', 'ADMIN']);

// Special admin auth middleware for admin user management
export const adminUserAuth = [jwtGuard, roleGuard(['ADMIN'])];
