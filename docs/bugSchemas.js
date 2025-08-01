/**
 * @swagger
 * components:
 *   schemas:
 *     Bug:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique bug ID
 *           example: "b123e4567-e89b-12d3-a456-426614174000"
 *         type:
 *           type: string
 *           description: Type of the bug (e.g., frontend, backend, database)
 *           example: "Backend"
 *         category:
 *           type: string
 *           description: Category of the bug (e.g., API Error, Validation Issue)
 *           example: "API Error"
 *         description:
 *           type: string
 *           description: Detailed description of the bug
 *           example: "User profile API returns 500 when updating email."
 *         level:
 *           type: string
 *           description: Severity level of the bug
 *           enum: [Low, Medium, High, Critical]
 *           example: "High"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date and time when the bug was created in the system
 *           example: "2025-07-31T10:15:30Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date and time when the bug record was last updated
 *           example: "2025-07-31T11:00:00Z"
 *       required:
 *         - type
 *         - category
 *         - description
 *         - level
 */
