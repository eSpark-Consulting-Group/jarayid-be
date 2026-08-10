/**
 * @swagger
 * components:
 *   schemas:
 *     StaticPage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the static page
 *         title:
 *           type: string
 *           description: Title of the static page
 *           maxLength: 100
 *         slug:
 *           type: string
 *           description: URL-friendly identifier (e.g., "privacy-policy")
 *           maxLength: 100
 *         content:
 *           type: string
 *           description: Full HTML or markdown content of the static page
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - id
 *         - title
 *         - slug
 *         - content
 *         - createdAt
 *         - updatedAt
 *
 *     StaticPageCreate:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: Title of the static page
 *           maxLength: 100
 *         slug:
 *           type: string
 *           description: URL-friendly identifier (e.g., "terms-of-service")
 *           maxLength: 100
 *         content:
 *           type: string
 *           description: Full HTML or markdown content of the static page
 *       required:
 *         - title
 *         - slug
 *         - content
 *       example:
 *         title: "Privacy Policy"
 *         slug: "privacy-policy"
 *         content: "<h1>Privacy Policy</h1><p>Your privacy matters...</p>"
 *
 *     StaticPageUpdate:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: Updated title for the static page
 *           maxLength: 100
 *         slug:
 *           type: string
 *           description: Updated slug (must still be URL-friendly)
 *           maxLength: 100
 *         content:
 *           type: string
 *           description: Updated content of the static page
 *       example:
 *         title: "Updated Privacy Policy"
 *         content: "<h1>Privacy Policy (Updated)</h1><p>We’ve made some changes...</p>"
 */
