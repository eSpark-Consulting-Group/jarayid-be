import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

import { response, generateToken } from '../utils/index.js';

const prisma = new PrismaClient();

/**
 * User registration & social signup/login controller
 * Handles all signup scenarios:
 *  - Local signup (hashed password)
 *  - Social signup (google/github) with validations
 *  - Re-login for existing social users
 */
export const signup = async (req, res) => {
    const { name, email, password, loginType = 'local' } = req.body;

    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            // Existing local user attempting any signup => reject
            if (!existingUser.isSocialLogin) {
                return response.error(res, 'Email is already registered', 409);
            }

            // Existing social user attempting SOCIAL signup again
            if (loginType !== 'local') {
                // Validate constraints: must have image and no password set
                if (!existingUser.image || existingUser.password) {
                    return response.error(res, 'Email already registered', 409);
                }

                // Issue fresh token and return (acts as login)
                const token = generateToken({ userId: existingUser.id, email: existingUser.email });
                return response.success(res, { user: existingUser, token }, 'User Socially logged in successfully');
            }

            // Existing social user trying LOCAL signup
            return response.error(res, 'Email already registered via social login', 409);
        }

        // Prepare data for user creation
        let hashedPassword = null;
        let isSocialLogin = false;

        if (loginType === 'local') {
            // Hash password for local signup
            const salt = await bcrypt.genSalt(10);
            hashedPassword = await bcrypt.hash(password, salt);
        } else {
            // Social signup
            isSocialLogin = true;
        }

        // Create the user
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                isSocialLogin,
                loginType
            }
        });

        // Issue JWT token
        const token = generateToken({ userId: user.id, email: user.email });

        return response.success(
            res,
            {
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    loginType: user.loginType
                },
                token
            },
            'User registered successfully'
        );
    } catch (error) {
        console.error('Signup error:', error);
        return response.error(res, 'Signup failed', 500, error.message);
    }
};

/**
 * User login controller – supports local & social logins.
 */
export const login = async (req, res) => {
    const { email, password, loginType = 'local' } = req.body;

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return response.error(res, 'Invalid credentials', 401);
        }

        // Local login flow
        if (loginType === 'local') {
            if (user.isSocialLogin) {
                return response.error(res, 'Use social login method', 400);
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return response.error(res, 'Invalid credentials', 401);
            }
        } else {
            // Social login flow
            if (!user.isSocialLogin || user.loginType !== loginType) {
                return response.error(res, 'Account not registered for this social provider', 400);
            }
        }

        // Issue token
        const token = generateToken({ userId: user.id, email: user.email });

        return response.success(res, { user, token }, 'Logged in successfully');
    } catch (error) {
        console.error('Login error:', error);
        return response.error(res, 'Login failed', 500, error.message);
    }
};
