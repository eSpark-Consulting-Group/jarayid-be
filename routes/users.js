import { Router } from 'express';

import userSchema from '../schemas/index.js';
import createValidationMiddleware from '../middleware/validate.js';
import UserController from '../controllers/index.js';
import auth from '../middleware/auth.js';

const router = Router();
const userController = new UserController();
const validation = createValidationMiddleware(userSchema);

// routes/users.js
/**
 * @swagger
 * /users/signup:
 *   post:
 *     summary: Register (local / social)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name,email]
 *             properties:
 *               name:  { type: string }
 *               email: { type: string, format: email }
 *               loginType: { type: string, enum: [local, google, github] }
 *               password: { type: string }
 *     responses:
 *       200: { description: User registered }
 *       400: { description: Validation error }
 */
router.post('/signup', validation.user.create, userController.signup);

/**
 * @swagger
 * /users/login:
 *   post:
 *     summary: Login (local / social)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *               loginType: { type: string, enum: [local, google, github] }
 *               password: { type: string }
 *     responses:
 *       200: { description: Logged in }
 *       401: { description: Invalid credentials }
 */
router.post('/login', validation.user.login, userController.login);

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get current user's profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Profile returned }
 *       401: { description: Unauthorized }
 */
router.get('/profile', auth.jwtGuard, userController.getProfile);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UserUpdate'
 *     responses:
 *       200: { description: User updated }
 *       404: { description: User not found }
 */
// Protect update route: user must be authenticated and either ADMIN or owner of profile
router.put(
    '/',
    auth.jwtGuard,
    auth.roleGuard(['ADMIN', 'USER']),
    validation.user.update,
    userController.update
);
export default router;
