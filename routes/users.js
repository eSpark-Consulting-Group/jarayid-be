import { Router } from 'express';

import userSchema from '../schemas/index.js';
import createValidationMiddleware from '../middleware/validate.js';
import UserController from '../controllers/index.js';
import {auth,userAuth} from '../middleware/auth.js';
import { singleUpload } from '../middleware/index.js';

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
router.get('/profile', auth, userController.getProfile);

/**
 * @swagger
 * /users:
 *   put:
 *     summary: Update user profile
 *     tags: [Users]
 *     security:
 *      - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *                 description: User's full name
 *               country:
 *                 type: string
 *                 maxLength: 100
 *                 description: User's country
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: User profile image file
 *           example:
 *             name: "Jane Doe"
 *             country: "United States"
 *             image: (binary file)
 *     responses:
 *       200: { description: User updated }
 *       404: { description: User not found }
 */
// Protect update route: user must be authenticated and either ADMIN or owner of profile
router.put(
    '/',
    auth,
    userAuth,
    singleUpload('image'),
    validation.user.update,
    userController.update
);

/**
 * @swagger
 * /users/forgot-password:
 *   post:
 *     summary: Request password reset link
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset link sent (or message indicating email sent)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "If this email is registered, you will receive a password reset link"
 *       400:
 *         description: Validation error or social login account
 *       500:
 *         description: Internal server error
 */
router.post('/forgot-password', validation.user.forgotPassword, userController.forgotPassword);

/**
 * @swagger
 * /users/verify-reset-token:
 *   get:
 *     summary: Verify password reset token validity
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset JWT token
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Reset token is valid"
 *                 data:
 *                   type: object
 *                   properties:
 *                     valid:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Invalid or expired token
 *       500:
 *         description: Internal server error
 */
router.get('/verify-reset-token', validation.user.verifyResetToken, userController.verifyResetToken);

/**
 * @swagger
 * /users/reset-password:
 *   post:
 *     summary: Reset password using valid token
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, newPassword]
 *             properties:
 *               token:
 *                 type: string
 *                 description: Password reset JWT token
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: New password (must contain uppercase, lowercase, number, and special character)
 *                 example: "NewSecure123!"
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password reset successfully"
 *       400:
 *         description: Invalid token, expired token, or validation error
 *       500:
 *         description: Internal server error
 */
router.post('/reset-password', validation.user.resetPassword, userController.resetPassword);

/**
 * @swagger
 * /users/set-password:
 *   post:
 *     summary: Change password from profile settings (requires authentication)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: Current password for verification
 *                 example: "OldPassword123!"
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *                 description: New password (must contain uppercase, lowercase, number, and special character)
 *                 example: "NewPassword123!"
 *     responses:
 *       200:
 *         description: Password updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: "Password updated successfully"
 *       400:
 *         description: Current password incorrect or validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/set-password', auth, validation.user.setPassword, userController.setPassword);

export default router;
