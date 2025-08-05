/**
 * @swagger
 * components:
 *   schemas:
 *     Comment:
 *       type: object
 *       required:
 *         - id
 *         - articleId
 *         - userId
 *         - content
 *         - isDeleted
 *         - createdAt
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the comment
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         articleId:
 *           type: string
 *           format: uuid
 *           description: ID of the article this comment belongs to
 *           example: "b392696f-e70a-4d81-9d4d-2994497150e7"
 *         userId:
 *           type: string
 *           format: uuid
 *           description: ID of the user who created the comment
 *           example: "user123-4567-8901-abcd-ef2345678901"
 *         content:
 *           type: string
 *           maxLength: 1000
 *           description: The comment content
 *           example: "This is a great article! Very informative and well-written."
 *         isDeleted:
 *           type: boolean
 *           description: Whether the comment has been soft deleted
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the comment was created
 *           example: "2025-07-22T14:30:00.000Z"
 *         user:
 *           type: object
 *           description: User information (included in responses)
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *               example: "user123-4567-8901-abcd-ef2345678901"
 *             name:
 *               type: string
 *               example: "John Doe"
 *             image:
 *               type: string
 *               format: uri
 *               nullable: true
 *               example: "https://example.com/avatar.jpg"
 *             role:
 *               type: string
 *               enum: [USER, ADMIN]
 *               example: "USER"
 *         article:
 *           type: object
 *           description: Article information (included in some responses)
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *               example: "b392696f-e70a-4d81-9d4d-2994497150e7"
 *             title:
 *               type: string
 *               example: "Amazing Technology Article"
 *             url:
 *               type: string
 *               format: uri
 *               nullable: true
 *               example: "https://example.com/article"
 *             category:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: "Technology"
 *
 *     CommentCreate:
 *       type: object
 *       required:
 *         - articleId
 *         - content
 *       properties:
 *         articleId:
 *           type: string
 *           format: uuid
 *           description: ID of the article to comment on
 *           example: "b392696f-e70a-4d81-9d4d-2994497150e7"
 *         content:
 *           type: string
 *           minLength: 1
 *           maxLength: 1000
 *           description: Comment content
 *           example: "This is a great article! Very informative."
 *
 *     CommentUpdate:
 *       type: object
 *       required:
 *         - content
 *       properties:
 *         content:
 *           type: string
 *           minLength: 1
 *           maxLength: 1000
 *           description: Updated comment content
 *           example: "This is my updated comment with new information."
 *
 *     CommentStats:
 *       type: object
 *       properties:
 *         summary:
 *           type: object
 *           properties:
 *             total:
 *               type: integer
 *               description: Total number of comments
 *               example: 1250
 *             active:
 *               type: integer
 *               description: Number of active (non-deleted) comments
 *               example: 1180
 *             deleted:
 *               type: integer
 *               description: Number of deleted comments
 *               example: 70
 *             today:
 *               type: integer
 *               description: Number of comments created today
 *               example: 25
 *             deletionRate:
 *               type: string
 *               description: Percentage of deleted comments
 *               example: "5.60"
 *         topCommenters:
 *           type: array
 *           description: Users with the most comments
 *           items:
 *             type: object
 *             properties:
 *               user:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   image:
 *                     type: string
 *                     format: uri
 *                     nullable: true
 *               commentCount:
 *                 type: integer
 *                 example: 45
 *         topArticles:
 *           type: array
 *           description: Articles with the most comments
 *           items:
 *             type: object
 *             properties:
 *               article:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   title:
 *                     type: string
 *                   url:
 *                     type: string
 *                     format: uri
 *                     nullable: true
 *                   category:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *               commentCount:
 *                 type: integer
 *                 example: 35
 */

export default {};
