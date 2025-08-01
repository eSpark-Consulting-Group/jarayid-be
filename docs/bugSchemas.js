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
 *           example: "4e533145-9fe6-4924-9164-0504fc43b838"
 *         type:
 *           type: string
 *           description: The type of the bug (e.g., error, warning)
 *           example: "error"
 *         category:
 *           type: string
 *           description: The category of the bug
 *           example: "Server"
 *         description:
 *           type: string
 *           description: A detailed description of the bug
 *           example: "NullPointerException when accessing user data"
 *         level:
 *           type: string
 *           description: Severity level of the bug (e.g., error, info, warning)
 *           example: "error"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the bug was created
 *           example: "2025-08-01T09:58:09.443Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the bug was last updated
 *           example: "2025-08-01T09:58:09.443Z"
 *       required:
 *         - type
 *         - category
 *         - description
 *         - level
 *         - createdAt
 *         - updatedAt
 *
 *     BugEvent:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique event ID for the bug
 *           example: "b7b22d63-c9b9-46bb-bcbf-f7e29d67e84d"
 *         bugId:
 *           type: string
 *           description: The ID of the associated bug
 *           example: "4e533145-9fe6-4924-9164-0504fc43b838"
 *         message:
 *           type: string
 *           description: The event message related to the bug
 *           example: "Bug encountered when user tries to login."
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the event was created
 *           example: "2025-08-01T09:58:09.443Z"
 *       required:
 *         - bugId
 *         - message
 *         - createdAt
 *
 *     BugCreate:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           description: The type of the bug (e.g., error, warning)
 *           example: "error"
 *         category:
 *           type: string
 *           description: The category of the bug
 *           example: "Server"
 *         description:
 *           type: string
 *           description: A detailed description of the bug
 *           example: "NullPointerException when accessing user data"
 *         level:
 *           type: string
 *           description: Severity level of the bug (e.g., error, info, warning)
 *           example: "error"
 *         eventMessage:
 *           type: string
 *           description: Optional event message for the bug
 *           example: "Encountered during user login"
 *       required:
 *         - type
 *         - category
 *         - description
 *         - level
 *
 *     BugUpdate:
 *       type: object
 *       properties:
 *         type:
 *           type: string
 *           description: The type of the bug (e.g., error, warning)
 *           example: "error"
 *         category:
 *           type: string
 *           description: The category of the bug
 *           example: "Client"
 *         description:
 *           type: string
 *           description: A detailed description of the bug
 *           example: "Out of memory exception in client-side JavaScript"
 *         level:
 *           type: string
 *           description: Severity level of the bug (e.g., error, info, warning)
 *           example: "warning"
 *         eventMessage:
 *           type: string
 *           description: Optional event message for the bug
 *           example: "Occurred during form submission"
 *       required:
 *         - type
 *         - category
 *         - description
 *         - level
 */
