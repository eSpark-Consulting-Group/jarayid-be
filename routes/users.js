import { Router } from 'express';

import userSchema from '../schemas/index.js';
import createValidationMiddleware from '../middleware/validate.js';
import UserController from '../controllers/index.js';
import {auth, userAuth, adminUserAuth} from '../middleware/auth.js';
import { singleUpload } from '../middleware/index.js';

const router = Router();
const userController = new UserController();
const validation = createValidationMiddleware(userSchema);

// Create query validation middleware
const createQueryValidator = (schema) => {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.query);
        if (error) {
            return res.status(400).json({
                success: false,
                message: error.details[0].message
            });
        }
        req.query = value;
        next();
    };
};

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
 *             required: [email]
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

// Admin Routes - User Management
/**
 * @swagger
 * /users/admin/users:
 *   get:
 *     summary: Get all users with advanced filtering and search (Admin only)
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of users per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in name, email, phone, or country
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [USER, ADMIN]
 *         description: Filter by user role
 *       - in: query
 *         name: isBanned
 *         schema:
 *           type: boolean
 *         description: Filter by ban status
 *       - in: query
 *         name: isSocialLogin
 *         schema:
 *           type: boolean
 *         description: Filter by social login users
 *       - in: query
 *         name: subscriptionStatus
 *         schema:
 *           type: string
 *           enum: [free, trial, premium]
 *         description: Filter by subscription status (legacy parameter)
 *       - in: query
 *         name: userPaidStatus
 *         schema:
 *           type: string
 *           enum: [free, trial, premium]
 *         description: Filter users by their current paid status (premium=active subscribers, trial=users in trial period, free=users without active subscriptions)
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-01-01"
 *         description: Filter users created from this date (YYYY-MM-DD format)
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *           example: "2025-07-30"
 *         description: Filter users created up to this date (YYYY-MM-DD format)
 *     responses:
 *       200:
 *         description: Users retrieved successfully
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
 *                   example: "Users retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           name:
 *                             type: object
 *                           email:
 *                             type: string
 *                           role:
 *                             type: string
 *                           isBanned:
 *                             type: boolean
 *                           subscription:
 *                             type: object
 *                             properties:
 *                               status:
 *                                 type: string
 *                               isPremium:
 *                                 type: boolean
 *                           stats:
 *                             type: object
 *                             properties:
 *                               articlesCreated:
 *                                 type: integer
 *                               commentsCount:
 *                                 type: integer
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                     meta:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: integer
 *                           description: Total number of users in the system
 *                         currentPageUsers:
 *                           type: integer
 *                           description: Number of users returned in current page
 *                         filters:
 *                           type: object
 *                           properties:
 *                             role:
 *                               type: string
 *                             isBanned:
 *                               type: boolean
 *                             isSocialLogin:
 *                               type: boolean
 *                             subscriptionStatus:
 *                               type: string
 *                             userPaidStatus:
 *                               type: string
 *                               description: Current filter value for user paid status
 *                             search:
 *                               type: string
 *                             from:
 *                               type: string
 *                             to:
 *                               type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/admin/users', createQueryValidator(userSchema.user.adminGetUsers), ...adminUserAuth, userController.getAllUsers);

/**
 * @swagger
 * /users/admin/users/{id}:
 *   get:
 *     summary: Get user details by ID (Admin only)
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User details retrieved successfully
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
 *                   example: "User details retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         name:
 *                           type: object
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                         isBanned:
 *                           type: boolean
 *                         subscription:
 *                           type: object
 *                           properties:
 *                             status:
 *                               type: string
 *                             history:
 *                               type: array
 *                         recentActivity:
 *                           type: object
 *                           properties:
 *                             articles:
 *                               type: array
 *                             comments:
 *                               type: array
 *                         stats:
 *                           type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get('/admin/users/:id', ...adminUserAuth, userController.getUserById);

/**
 * @swagger
 * /users/admin/users/{id}/toggle-ban:
 *   patch:
 *     summary: Ban or unban a user (Admin only)
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to ban/unban
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 description: Reason for banning/unbanning
 *                 example: "Violated community guidelines"
 *     responses:
 *       200:
 *         description: User ban status updated successfully
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
 *                   example: "User banned successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         isBanned:
 *                           type: boolean
 *                     action:
 *                       type: string
 *                       example: "banned"
 *                     reason:
 *                       type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required or cannot ban admins
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.patch('/admin/users/:id/toggle-ban', validation.user.adminToggleBan, ...adminUserAuth, userController.toggleUserBan);

/**
 * @swagger
 * /users/admin/users/bulk-delete:
 *   delete:
 *     summary: Bulk delete (soft delete) multiple users by setting isBanned to true (Admin only)
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userIds]
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 100
 *                 description: Array of user IDs to delete (UUID format)
 *                 example: ["550e8400-e29b-41d4-a716-446655440000", "550e8400-e29b-41d4-a716-446655440001"]
 *               reason:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 500
 *                 description: Optional reason for bulk deletion
 *                 example: "Spam accounts cleanup"
 *     responses:
 *       200:
 *         description: Bulk deletion completed successfully
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
 *                   example: "Successfully deleted 5 user(s)"
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalRequested:
 *                           type: integer
 *                           example: 6
 *                         totalFound:
 *                           type: integer
 *                           example: 5
 *                         totalDeleted:
 *                           type: integer
 *                           example: 4
 *                         alreadyBanned:
 *                           type: integer
 *                           example: 1
 *                         adminUsersSkipped:
 *                           type: integer
 *                           example: 0
 *                     deletedUsers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           email:
 *                             type: string
 *                           name:
 *                             type: string
 *                     skippedUsers:
 *                       type: object
 *                       properties:
 *                         alreadyBanned:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               email:
 *                                 type: string
 *                               reason:
 *                                 type: string
 *                                 example: "Already banned"
 *                         adminUsers:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               email:
 *                                 type: string
 *                               reason:
 *                                 type: string
 *                                 example: "Cannot delete admin users"
 *                     reason:
 *                       type: string
 *                       nullable: true
 *       400:
 *         description: Validation error or invalid request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "userIds array is required and cannot be empty"
 *       403:
 *         description: Forbidden - Admin access required or cannot delete own account
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "Cannot delete your own account"
 *       404:
 *         description: No valid users found for the provided IDs
 *       500:
 *         description: Internal server error
 */
router.delete('/admin/users/bulk-delete', validation.user.bulkDeleteUsers, ...adminUserAuth, userController.bulkDeleteUsers);

// Trial Management Routes

/**
 * @swagger
 * /users/trial/status:
 *   get:
 *     summary: Get current user's trial status
 *     tags: [Users - Trial Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trial status retrieved successfully
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
 *                   example: "Trial status retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     hasTrialHistory:
 *                       type: boolean
 *                       example: true
 *                     currentStatus:
 *                       type: string
 *                       enum: [active, expired, no_trial]
 *                       example: "active"
 *                     trialEndsAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-08-06T10:30:00.000Z"
 *                     daysRemaining:
 *                       type: integer
 *                       example: 5
 *                     subscriptionId:
 *                       type: string
 *                       format: uuid
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get('/trial/status', auth, userController.getTrialStatus);

/**
 * @swagger
 * /users/admin/trials/check-expiration:
 *   post:
 *     summary: Manually check and expire trials (Admin only)
 *     tags: [Admin - Trial Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trial expiration check completed
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
 *                   example: "Processed 3 expired trials"
 *                 data:
 *                   type: object
 *                   properties:
 *                     expiredCount:
 *                       type: integer
 *                       example: 3
 *                     expired:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           subscriptionId:
 *                             type: string
 *                             format: uuid
 *                           userId:
 *                             type: string
 *                             format: uuid
 *                           userEmail:
 *                             type: string
 *                           trialEndsAt:
 *                             type: string
 *                             format: date-time
 *                           expiredAt:
 *                             type: string
 *                             format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/admin/trials/check-expiration', ...adminUserAuth, userController.checkTrialExpiration);

/**
 * @swagger
 * /users/admin/trials/{userId}/extend:
 *   post:
 *     summary: Extend a user's trial period (Admin only)
 *     tags: [Admin - Trial Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: User ID whose trial to extend
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [additionalDays]
 *             properties:
 *               additionalDays:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 30
 *                 description: Number of days to extend the trial (1-30)
 *                 example: 7
 *     responses:
 *       200:
 *         description: Trial extended successfully
 *       400:
 *         description: Invalid request or trial not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.post('/admin/trials/:userId/extend', validation.user.extendTrial, ...adminUserAuth, userController.extendUserTrial);

/**
 * @swagger
 * /users/admin/trials/stats:
 *   get:
 *     summary: Get trial statistics (Admin only)
 *     tags: [Admin - Trial Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trial statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     activeTrials:
 *                       type: integer
 *                       example: 25
 *                     expiredTrials:
 *                       type: integer
 *                       example: 150
 *                     totalTrialsCreated:
 *                       type: integer
 *                       example: 200
 *                     convertedUsers:
 *                       type: integer
 *                       example: 45
 *                     conversionRate:
 *                       type: string
 *                       example: "22.50%"
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/admin/trials/stats', ...adminUserAuth, userController.getTrialStats);

/**
 * @swagger
 * /users/admin/trials/expiring:
 *   get:
 *     summary: Get trials expiring soon (Admin only)
 *     tags: [Admin - Trial Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 7
 *           default: 1
 *         description: Number of days ahead to check for expiring trials
 *     responses:
 *       200:
 *         description: Expiring trials retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     trials:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           subscriptionId:
 *                             type: string
 *                             format: uuid
 *                           userId:
 *                             type: string
 *                             format: uuid
 *                           userEmail:
 *                             type: string
 *                           userName:
 *                             type: string
 *                           trialEndsAt:
 *                             type: string
 *                             format: date-time
 *                           daysRemaining:
 *                             type: integer
 *                     count:
 *                       type: integer
 *                       example: 8
 *                     daysAhead:
 *                       type: integer
 *                       example: 1
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/admin/trials/expiring', createQueryValidator(userSchema.user.getTrialsExpiring), ...adminUserAuth, userController.getTrialsExpiringSoon);

/**
 * @swagger
 * /users/admin/stats:
 *   get:
 *     summary: Get comprehensive user statistics dashboard (Admin only)
 *     tags: [Admin - User Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [7d, 30d, 90d, all]
 *           default: 30d
 *         description: Time period for statistics
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
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
 *                   example: "User statistics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     overview:
 *                       type: object
 *                       properties:
 *                         totalUsers:
 *                           type: integer
 *                         activeUsers:
 *                           type: integer
 *                         bannedUsers:
 *                           type: integer
 *                         adminUsers:
 *                           type: integer
 *                         conversionRate:
 *                           type: string
 *                     subscriptions:
 *                       type: object
 *                       properties:
 *                         premium:
 *                           type: integer
 *                         trial:
 *                           type: integer
 *                         free:
 *                           type: integer
 *                     geography:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           country:
 *                             type: string
 *                           count:
 *                             type: integer
 *                     activity:
 *                       type: object
 *                       properties:
 *                         dailyRegistrations:
 *                           type: array
 *                         topActiveUsers:
 *                           type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Internal server error
 */
router.get('/admin/stats', createQueryValidator(userSchema.user.adminUserStats), ...adminUserAuth, userController.getUserStats);

export default router;
