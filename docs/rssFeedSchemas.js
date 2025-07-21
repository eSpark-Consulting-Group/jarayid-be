/**
 * @swagger
 * components:
 *   schemas:
 *     RSSFeed:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the RSS feed
 *         name:
 *           type: string
 *           description: RSS feed name
 *           minLength: 3
 *           maxLength: 500
 *         url:
 *           type: string
 *           format: uri
 *           description: RSS feed URL
 *           maxLength: 500
 *         status:
 *           type: string
 *           enum: [DRAFT, PUBLISH, ARCHIVE]
 *           default: DRAFT
 *           description: RSS feed status
 *         logo:
 *           type: string
 *           format: uri
 *           description: RSS feed logo URL
 *         categoryId:
 *           type: string
 *           format: uuid
 *           description: Associated category ID
 *         category:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: string
 *             type:
 *               type: string
 *               enum: [COUNTRY, NORMAL, MEDIA]
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - url
 *         - categoryId
 *     RSSFeedCreate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: RSS feed name
 *           minLength: 3
 *           maxLength: 500
 *         url:
 *           type: string
 *           format: uri
 *           description: RSS feed URL
 *           maxLength: 500
 *         categoryId:
 *           type: string
 *           format: uuid
 *           description: Category ID for this RSS feed
 *         status:
 *           type: string
 *           enum: [DRAFT, PUBLISH, ARCHIVE]
 *           default: DRAFT
 *           description: RSS feed status
 *         logo:
 *           type: string
 *           format: binary
 *           description: RSS feed logo image file (multipart/form-data)
 *       required:
 *         - name
 *         - url
 *         - categoryId
 *       example:
 *         name: "TechCrunch Technology Feed"
 *         url: "https://techcrunch.com/feed/"
 *         categoryId: "550e8400-e29b-41d4-a716-446655440000"
 *         status: "PUBLISH"
 *     RSSFeedUpdate:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: RSS feed name
 *           minLength: 3
 *           maxLength: 500
 *         url:
 *           type: string
 *           format: uri
 *           description: RSS feed URL
 *           maxLength: 500
 *         categoryId:
 *           type: string
 *           format: uuid
 *           description: Category ID for this RSS feed
 *         status:
 *           type: string
 *           enum: [DRAFT, PUBLISH, ARCHIVE]
 *           description: RSS feed status
 *         logo:
 *           type: string
 *           format: binary
 *           description: RSS feed logo image file (multipart/form-data)
 *       example:
 *         name: "Updated TechCrunch Technology Feed"
 *         url: "https://techcrunch.com/updated-feed/"
 *         status: "PUBLISH"
 */
