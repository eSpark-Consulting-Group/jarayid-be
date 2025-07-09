import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

import { response, generateToken } from '../utils/index.js';

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
                const salt = await bcrypt.genSalt(10);
                hashedPassword = await bcrypt.hash(password, salt);
            } else {
                isSocialLogin = true;
            }

            const user = await prisma.user.create({
                data: { name, email, password: hashedPassword, isSocialLogin, loginType }
            });

            const token = generateToken({ userId: user.id, email: user.email });
            return response.success(res, { user: { id: user.id, name: user.name, email: user.email, loginType: user.loginType }, token }, 'User registered successfully');
        } catch (error) {
            console.error('Signup error:', error);
            return response.error(res, 'Signup failed', 500, error.message);
        }
    }

    // User login controller
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
            console.error('Login error:', error);
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
            console.error('Get profile error:', error);
            return response.error(res, 'Failed to fetch profile', 500, error.message);
        }
    }

    // Update user profile (excluding password changes)
    async update(req, res) {
        const id = req.user.id;
        const allowedFields = ['name', 'email'];
        const data = {};
        allowedFields.forEach((key) => {
            if (req.body[key] !== undefined) data[key] = req.body[key];
        });
        if (Object.keys(data).length === 0) {
            return response.error(res, 'No valid fields provided for update', 400);
        }
        try {
            const user = await prisma.user.update({ where: { id }, data });
            return response.success(res, { user }, 'User updated successfully');
        } catch (error) {
            console.error('Update user error:', error);
            if (error.code === 'P2025') {
                return response.notFound(res, 'User not found');
            }
            return response.error(res, 'User update failed', 500, error.message);
        }
    }
}

export default UserController;
