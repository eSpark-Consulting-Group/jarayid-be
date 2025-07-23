import { Router } from 'express';

import schemas from '../schemas/index.js';
import createValidationMiddleware from '../middleware/validate.js';
import { CommentController } from '../controllers/index.js';
import { auth, adminAuth } from '../middleware/index.js';

const router = Router();
const commentController = new CommentController();
const validation = createValidationMiddleware(schemas);

/**
 * @swagger
 * /comments:
 *   post:
 *     summary: Create a new comment on an article
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - articleId
 *               - content
 *             properties:
 *               articleId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the article to comment on
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *                 description: Comment content
 *           example:
 *             articleId: "b392696f-e70a-4d81-9d4d-2994497150e7"
 *             content: "This is a great article! Very informative."
 *     responses:
 *       201:
 *         description: Comment created successfully
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
 *                   example: "Comment created successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     comment:
 *                       $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Validation error or invalid article ID
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: User is banned from commenting
 *       404:
 *         description: Article not found
 *       500:
 *         description: Internal server error
 */

// Route: POST /api/comments
// Description: Create a new comment on an article
// Access: Private (authenticated users only)
router.post('/', 
    auth, 
    validation.comment.create, 
    commentController.createComment
);

/**
 * @swagger
 * /comments/article/{articleId}:
 *   get:
 *     summary: Get all comments for a specific article
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: articleId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Article ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of comments per page
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest]
 *           default: newest
 *         description: Sort order for comments
 *     responses:
 *       200:
 *         description: Comments retrieved successfully
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
 *                   example: "Comments retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Comment'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                     meta:
 *                       type: object
 *                       properties:
 *                         article:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                             title:
 *                               type: string
 *                         totalComments:
 *                           type: integer
 *                         sortBy:
 *                           type: string
 *       400:
 *         description: Invalid article ID
 *       404:
 *         description: Article not found
 *       500:
 *         description: Internal server error
 */

// Route: GET /api/comments/article/:articleId
// Description: Get all comments for a specific article with pagination
// Access: Public
router.get('/article/:articleId', 
    validation.comment.articleParams,
    validation.comment.query, 
    commentController.getArticleComments
);

/**
 * @swagger
 * /comments/my-comments:
 *   get:
 *     summary: Get current user's comments across all articles
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of comments per page
 *       - in: query
 *         name: includeDeleted
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: false
 *         description: Include deleted comments
 *     responses:
 *       200:
 *         description: User comments retrieved successfully
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
 *                   example: "User comments retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - $ref: '#/components/schemas/Comment'
 *                           - type: object
 *                             properties:
 *                               article:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: string
 *                                   title:
 *                                     type: string
 *                                   url:
 *                                     type: string
 *                                   category:
 *                                     type: object
 *                                     properties:
 *                                       name:
 *                                         type: string
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *                     meta:
 *                       type: object
 *                       properties:
 *                         totalComments:
 *                           type: integer
 *                         includeDeleted:
 *                           type: boolean
 *       401:
 *         description: Unauthorized - Authentication required
 *       500:
 *         description: Internal server error
 */

// Route: GET /api/comments/my-comments
// Description: Get current user's comments across all articles
// Access: Private (authenticated users only)
router.get('/my-comments', 
    auth, 
    validation.comment.query, 
    commentController.getUserComments
);

/**
 * @swagger
 * /comments/stats:
 *   get:
 *     summary: Get comment statistics for admin dashboard
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Comment statistics retrieved successfully
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
 *                   example: "Comment statistics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     summary:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           description: Total number of comments
 *                         active:
 *                           type: integer
 *                           description: Number of active (non-deleted) comments
 *                         deleted:
 *                           type: integer
 *                           description: Number of deleted comments
 *                         today:
 *                           type: integer
 *                           description: Number of comments created today
 *                         deletionRate:
 *                           type: string
 *                           description: Percentage of deleted comments
 *                     topCommenters:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           user:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               image:
 *                                 type: string
 *                           commentCount:
 *                             type: integer
 *                     topArticles:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           article:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               title:
 *                                 type: string
 *                               url:
 *                                 type: string
 *                               category:
 *                                 type: object
 *                                 properties:
 *                                   name:
 *                                     type: string
 *                           commentCount:
 *                             type: integer
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Access denied - Admin role required
 *       500:
 *         description: Internal server error
 */

// Route: GET /api/comments/stats
// Description: Get comment statistics for admin dashboard
// Access: Private (admin only)
router.get('/stats', 
    auth, 
    adminAuth,
    commentController.getCommentStats
);

/**
 * @swagger
 * /comments/{commentId}:
 *   get:
 *     summary: Get a specific comment by ID
 *     tags: [Comments]
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment retrieved successfully
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
 *                   example: "Comment retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     comment:
 *                       allOf:
 *                         - $ref: '#/components/schemas/Comment'
 *                         - type: object
 *                           properties:
 *                             article:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                 title:
 *                                   type: string
 *                                 url:
 *                                   type: string
 *       400:
 *         description: Invalid comment ID
 *       404:
 *         description: Comment not found
 *       410:
 *         description: Comment has been deleted
 *       500:
 *         description: Internal server error
 */

// Route: GET /api/comments/:commentId
// Description: Get a specific comment by ID
// Access: Public
router.get('/:commentId', 
    validation.comment.params,
    commentController.getCommentById
);

/**
 * @swagger
 * /comments/{commentId}:
 *   put:
 *     summary: Update a comment (only by comment author)
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Comment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *                 description: Updated comment content
 *           example:
 *             content: "This is my updated comment with new information."
 *     responses:
 *       200:
 *         description: Comment updated successfully
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
 *                   example: "Comment updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     comment:
 *                       $ref: '#/components/schemas/Comment'
 *       400:
 *         description: Validation error or invalid comment ID
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Access denied - Can only edit your own comments, or user is banned
 *       404:
 *         description: Comment not found
 *       410:
 *         description: Comment has been deleted
 *       500:
 *         description: Internal server error
 */

// Route: PUT /api/comments/:commentId
// Description: Update a comment (only by comment author)
// Access: Private (comment author only)
router.put('/:commentId', 
    auth, 
    validation.comment.params,
    validation.comment.update, 
    commentController.updateComment
);

/**
 * @swagger
 * /comments/{commentId}:
 *   delete:
 *     summary: Delete a comment (soft delete)
 *     description: Delete a comment. Only the comment author or admin can delete comments. This is a soft delete - the comment is marked as deleted but not removed from the database.
 *     tags: [Comments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Comment ID
 *     responses:
 *       200:
 *         description: Comment deleted successfully
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
 *                   example: "Comment deleted successfully"
 *                 data:
 *                   type: null
 *       400:
 *         description: Invalid comment ID
 *       401:
 *         description: Unauthorized - Authentication required
 *       403:
 *         description: Access denied - Can only delete your own comments (unless admin)
 *       404:
 *         description: Comment not found
 *       410:
 *         description: Comment has already been deleted
 *       500:
 *         description: Internal server error
 */

// Route: DELETE /api/comments/:commentId
// Description: Delete a comment (only by comment author or admin)
// Access: Private (comment author or admin)
router.delete('/:commentId', 
    auth, 
    validation.comment.params,
    commentController.deleteComment
);

export default router;
