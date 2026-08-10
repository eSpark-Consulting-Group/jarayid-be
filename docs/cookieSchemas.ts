/**
 * @swagger
 * components:
 *   schemas:
 *     Cookie:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - purpose
 *         - duration
 *         - category
 *         - isEssential
 *         - isEnabled
 *         - createdAt
 *         - updatedAt
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the cookie
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         name:
 *           type: string
 *           pattern: '^[a-zA-Z0-9_-]+$'
 *           minLength: 2
 *           maxLength: 100
 *           description: The cookie name (only alphanumeric, hyphens, and underscores allowed)
 *           example: "session_token"
 *         purpose:
 *           type: string
 *           minLength: 10
 *           maxLength: 500
 *           description: Explanation of why this cookie is used
 *           example: "This cookie is used to maintain user session state and authentication status while browsing the website."
 *         duration:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           description: How long the cookie persists
 *           example: "1 year"
 *         category:
 *           type: string
 *           enum: [ESSENTIAL, FUNCTIONAL, ANALYTICS, MARKETING, PREFERENCES]
 *           description: Category of the cookie for consent management
 *           example: "ESSENTIAL"
 *         isEssential:
 *           type: boolean
 *           description: Whether this cookie is essential for website functionality
 *           example: true
 *         isEnabled:
 *           type: boolean
 *           description: Whether this cookie is currently enabled
 *           example: true
 *         description:
 *           type: string
 *           maxLength: 1000
 *           description: Additional details about the cookie (optional)
 *           example: "Essential for user authentication and security. Cannot be disabled."
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: When the cookie was created
 *           example: "2024-01-15T10:30:00.000Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: When the cookie was last updated
 *           example: "2024-01-15T10:30:00.000Z"
 *
 *     CookieInput:
 *       type: object
 *       required:
 *         - name
 *         - purpose
 *         - duration
 *       properties:
 *         name:
 *           type: string
 *           pattern: '^[a-zA-Z0-9_-]+$'
 *           minLength: 2
 *           maxLength: 100
 *           description: The cookie name (only alphanumeric, hyphens, and underscores allowed)
 *           example: "analytics_tracking"
 *         purpose:
 *           type: string
 *           minLength: 10
 *           maxLength: 500
 *           description: Explanation of why this cookie is used
 *           example: "This cookie helps us understand how visitors interact with our website by collecting and reporting information anonymously."
 *         duration:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           description: How long the cookie persists
 *           example: "2 years"
 *         category:
 *           type: string
 *           enum: [ESSENTIAL, FUNCTIONAL, ANALYTICS, MARKETING, PREFERENCES]
 *           default: FUNCTIONAL
 *           description: Category of the cookie for consent management
 *           example: "ANALYTICS"
 *         isEssential:
 *           type: boolean
 *           default: false
 *           description: Whether this cookie is essential for website functionality
 *           example: false
 *         isEnabled:
 *           type: boolean
 *           default: true
 *           description: Whether this cookie is currently enabled
 *           example: true
 *         description:
 *           type: string
 *           maxLength: 1000
 *           description: Additional details about the cookie (optional)
 *           example: "Used by Google Analytics to distinguish users and sessions."
 *
 *     CookieUpdate:
 *       type: object
 *       minProperties: 1
 *       properties:
 *         name:
 *           type: string
 *           pattern: '^[a-zA-Z0-9_-]+$'
 *           minLength: 2
 *           maxLength: 100
 *           description: The cookie name (only alphanumeric, hyphens, and underscores allowed)
 *         purpose:
 *           type: string
 *           minLength: 10
 *           maxLength: 500
 *           description: Explanation of why this cookie is used
 *         duration:
 *           type: string
 *           minLength: 1
 *           maxLength: 50
 *           description: How long the cookie persists
 *         category:
 *           type: string
 *           enum: [ESSENTIAL, FUNCTIONAL, ANALYTICS, MARKETING, PREFERENCES]
 *           description: Category of the cookie for consent management
 *         isEssential:
 *           type: boolean
 *           description: Whether this cookie is essential for website functionality
 *         isEnabled:
 *           type: boolean
 *           description: Whether this cookie is currently enabled
 *         description:
 *           type: string
 *           maxLength: 1000
 *           description: Additional details about the cookie (optional)
 *
 *     CookieBulkUpdate:
 *       type: object
 *       required:
 *         - cookieIds
 *         - updates
 *       properties:
 *         cookieIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           minItems: 1
 *           maxItems: 50
 *           description: Array of cookie IDs to update
 *           example: ["123e4567-e89b-12d3-a456-426614174000", "987fcdeb-51a2-43d7-b456-426614174999"]
 *         updates:
 *           type: object
 *           minProperties: 1
 *           properties:
 *             category:
 *               type: string
 *               enum: [ESSENTIAL, FUNCTIONAL, ANALYTICS, MARKETING, PREFERENCES]
 *               description: New category for all selected cookies
 *             isEnabled:
 *               type: boolean
 *               description: New enabled status for all selected cookies
 *             purpose:
 *               type: string
 *               minLength: 10
 *               maxLength: 500
 *               description: New purpose for all selected cookies
 *             duration:
 *               type: string
 *               minLength: 1
 *               maxLength: 50
 *               description: New duration for all selected cookies
 *             description:
 *               type: string
 *               maxLength: 1000
 *               description: New description for all selected cookies
 *
 *     CookieStats:
 *       type: object
 *       properties:
 *         total:
 *           type: integer
 *           description: Total number of cookies
 *           example: 25
 *         enabled:
 *           type: integer
 *           description: Number of enabled cookies
 *           example: 20
 *         disabled:
 *           type: integer
 *           description: Number of disabled cookies
 *           example: 5
 *         essential:
 *           type: integer
 *           description: Number of essential cookies
 *           example: 3
 *         byCategory:
 *           type: object
 *           properties:
 *             ESSENTIAL:
 *               type: integer
 *               example: 3
 *             FUNCTIONAL:
 *               type: integer
 *               example: 5
 *             ANALYTICS:
 *               type: integer
 *               example: 8
 *             MARKETING:
 *               type: integer
 *               example: 6
 *             PREFERENCES:
 *               type: integer
 *               example: 3
 *
 *     CookiesResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Cookies retrieved successfully"
 *         data:
 *           type: object
 *           properties:
 *             cookies:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Cookie'
 *             pagination:
 *               type: object
 *               properties:
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 *                 totalPages:
 *                   type: integer
 *                   example: 3
 *                 totalItems:
 *                   type: integer
 *                   example: 25
 *                 itemsPerPage:
 *                   type: integer
 *                   example: 10
 *                 hasNextPage:
 *                   type: boolean
 *                   example: true
 *                 hasPrevPage:
 *                   type: boolean
 *                   example: false
 *
 *     PublicCookiesResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: "Public cookies retrieved successfully"
 *         data:
 *           type: object
 *           properties:
 *             cookies:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                   purpose:
 *                     type: string
 *                   duration:
 *                     type: string
 *                   category:
 *                     type: string
 *                     enum: [ESSENTIAL, FUNCTIONAL, ANALYTICS, MARKETING, PREFERENCES]
 *                   isEssential:
 *                     type: boolean
 *                   description:
 *                     type: string
 *             total:
 *               type: integer
 *               example: 20
 *             categories:
 *               type: object
 *               properties:
 *                 ESSENTIAL:
 *                   type: integer
 *                   example: 3
 *                 FUNCTIONAL:
 *                   type: integer
 *                   example: 5
 *                 ANALYTICS:
 *                   type: integer
 *                   example: 6
 *                 MARKETING:
 *                   type: integer
 *                   example: 4
 *                 PREFERENCES:
 *                   type: integer
 *                   example: 2
 *
 *   parameters:
 *     CookieId:
 *       in: path
 *       name: id
 *       required: true
 *       schema:
 *         type: string
 *         format: uuid
 *       description: The unique identifier of the cookie
 *       example: "123e4567-e89b-12d3-a456-426614174000"
 *
 *     CookieCategory:
 *       in: query
 *       name: category
 *       schema:
 *         type: string
 *         enum: [ESSENTIAL, FUNCTIONAL, ANALYTICS, MARKETING, PREFERENCES]
 *       description: Filter cookies by category
 *       example: "ANALYTICS"
 *
 *     CookieSearch:
 *       in: query
 *       name: search
 *       schema:
 *         type: string
 *         maxLength: 255
 *       description: Search cookies by name, purpose, or description
 *       example: "analytics"
 *
 *     CookieSortBy:
 *       in: query
 *       name: sortBy
 *       schema:
 *         type: string
 *         enum: [name, purpose, category, duration, createdAt, updatedAt]
 *         default: createdAt
 *       description: Field to sort cookies by
 *       example: "name"
 *
 *     CookieSortOrder:
 *       in: query
 *       name: sortOrder
 *       schema:
 *         type: string
 *         enum: [asc, desc]
 *         default: desc
 *       description: Sort order for cookies
 *       example: "asc"
 */

export default {};
