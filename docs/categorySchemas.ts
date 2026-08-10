/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the category
 *         name:
 *           type: string
 *           description: Category name
 *           minLength: 3
 *           maxLength: 500
 *         type:
 *           type: string
 *           enum: [COUNTRY, NORMAL, MEDIA]
 *           description: Type of category
 *         logo:
 *           type: string
 *           format: uri
 *           description: Logo URL
 *         logoKey:
 *           type: string
 *           description: Logo storage key
 *         videoUrl:
 *           type: string
 *           format: uri
 *           description: Video URL
 *         description:
 *           type: string
 *           maxLength: 2000
 *           description: Category description
 *         seoMeta:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *               maxLength: 200
 *             description:
 *               type: string
 *               maxLength: 500
 *             keywords:
 *               type: array
 *               items:
 *                 type: string
 *             ogImage:
 *               type: string
 *               format: uri
 *             canonicalUrl:
 *               type: string
 *               format: uri
 *         thresholdDays:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 7
 *           description: Threshold days for the category
 *         createdBy:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: object
 *             email:
 *               type: string
 *               format: email
 *           description: Information about the user who created this category
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - name
 *         - type
 *     CategoryInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Category name
 *           minLength: 3
 *           maxLength: 500
 *         type:
 *           type: string
 *           enum: [COUNTRY, NORMAL, MEDIA]
 *           description: Type of category
 *         logo:
 *           type: string
 *           format: binary
 *           description: Logo image file
 *         videoUrl:
 *           type: string
 *           format: uri
 *           description: Video URL
 *         description:
 *           type: string
 *           maxLength: 2000
 *           description: Category description
 *         seoMeta:
 *           type: string
 *           description: |
 *             JSON string containing SEO metadata. Must be a valid JSON string with the following structure:
 *             ```json
 *             {
 *               "title": "Page title (max 200 chars)",
 *               "description": "Meta description (max 500 chars)",
 *               "keywords": ["keyword1", "keyword2"],
 *               "ogImage": "https://example.com/image.jpg",
 *               "canonicalUrl": "https://example.com/canonical"
 *             }
 *             ```
 *           example: '{"title":"Technology News","description":"Latest tech updates","keywords":["tech","news"]}'
 *         thresholdDays:
 *           type: integer
 *           minimum: 1
 *           maximum: 365
 *           default: 7
 *           description: Threshold days for the category
 *       required:
 *         - name
 *         - type
 */
