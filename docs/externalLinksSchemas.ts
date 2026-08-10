/**
 * @swagger
 * components:
 *   schemas:
 *     ExternalLink:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique external link ID
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         toolName:
 *           type: string
 *           description: Name of the tool or resource
 *           minLength: 3
 *           maxLength: 255
 *           example: "ChatGPT"
 *         toolRedirectLink:
 *           type: string
 *           format: uri
 *           description: The full URL for the external resource
 *           maxLength: 1024
 *           example: "https://chat.openai.com"
 *         status:
 *           type: string
 *           description: Whether the link is active or inactive
 *           enum: [ACTIVE, INACTIVE]
 *           default: ACTIVE
 *           example: "ACTIVE"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date and time when the external link was created
 *           example: "2025-07-29T12:00:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date and time when the external link was last updated
 *           example: "2025-07-29T14:00:00Z"
 *       required:
 *         - toolName
 *         - toolRedirectLink
 *         - status
 *
 *     ExternalLinkCreate:
 *       type: object
 *       properties:
 *         toolName:
 *           type: string
 *           description: Name of the tool or resource
 *           minLength: 3
 *           maxLength: 255
 *           example: "ChatGPT"
 *         toolRedirectLink:
 *           type: string
 *           format: uri
 *           description: The full URL for the external resource
 *           maxLength: 1024
 *           example: "https://chat.openai.com"
 *         status:
 *           type: string
 *           description: Whether the link is active or inactive
 *           enum: [ACTIVE, INACTIVE]
 *           default: ACTIVE
 *           example: "ACTIVE"
 *       required:
 *         - toolName
 *         - toolRedirectLink
 *         - status
 *
 *     ExternalLinkUpdate:
 *       type: object
 *       properties:
 *         toolName:
 *           type: string
 *           description: Name of the tool or resource
 *           minLength: 3
 *           maxLength: 255
 *           example: "Updated ChatGPT"
 *         toolRedirectLink:
 *           type: string
 *           format: uri
 *           description: The full URL for the external resource
 *           maxLength: 1024
 *           example: "https://platform.openai.com"
 *         status:
 *           type: string
 *           description: Whether the link is active or inactive
 *           enum: [ACTIVE, INACTIVE]
 *           example: "INACTIVE"
 */
