import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import response from '../utils/response.js';
const prisma = new PrismaClient();

const auth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return response.unauthorized(res, 'No token provided');
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

// Admin authentication middleware
const adminAuth = async (req, res, next) => {
    try {
        await auth(req, res, async () => {
            if (req.user.isAdmin) {
                next();
            } else {
                response.unauthorized(res, 'Admin access required');
            }
        });
    } catch (error) {
        response.error(res, 'Authentication error', 500);
    }
};

export default {
    auth,
    adminAuth
};
