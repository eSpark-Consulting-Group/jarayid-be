/**
 * @swagger
 * components:
 *   schemas:
 *     ApiKey:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique API key ID (UUID)
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         key:
 *           type: string
 *           description: The API key string
 *           minLength: 10
 *           maxLength: 255
 *           example: "sk_live_51HqN4s...AbCdEf"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date and time when the API key was created
 *           example: "2025-07-29T12:00:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date and time when the API key was last updated
 *           example: "2025-07-29T14:00:00Z"
 *       required:
 *         - key
 *
 *     ApiKeySave:
 *       type: object
 *       properties:
 *         key:
 *           type: string
 *           description: The API key string
 *           minLength: 10
 *           maxLength: 255
 *           example: "sk_live_51HqN4s...AbCdEf"
 *       required:
 *         - key
 */
