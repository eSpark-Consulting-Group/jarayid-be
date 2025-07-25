/**
 * @swagger
 * components:
 *   schemas:
 *     Article:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the article
 *         title:
 *           type: string
 *           description: Article title
 *           minLength: 3
 *           maxLength: 500
 *         url:
 *           type: string
 *           format: uri
 *           description: Article URL
 *           maxLength: 500
 *         source:
 *           type: string
 *           description: Article source
 *           minLength: 2
 *           maxLength: 500
 *         originalContent:
 *           type: object
 *           description: Original article content in JSON format
 *         summaryArabic:
 *           type: string
 *           description: Arabic summary of the article
 *           maxLength: 2000
 *         summaryEnglish:
 *           type: string
 *           description: English summary of the article
 *           maxLength: 2000
 *         image:
 *           type: string
 *           format: uri
 *           description: Article image URL
 *         imageKey:
 *           type: string
 *           description: Article image storage key
 *         categoryId:
 *           type: string
 *           format: uuid
 *           description: Associated category ID
 *         subType:
 *           type: string
 *           enum: [SPORTS, ECONOMICS, POLITICS]
 *           description: Article sub-type for categorization
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
 *           description: Category information
 *         pinned:
 *           type: boolean
 *           default: false
 *           description: Whether the article is pinned
 *         viewCount:
 *           type: integer
 *           default: 0
 *           description: Number of views
 *         publishedAt:
 *           type: string
 *           format: date-time
 *           description: Publication date
 *         userId:
 *           type: string
 *           format: uuid
 *           description: ID of the admin who created the article
 *         author:
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
 *           description: Author information
 *         _count:
 *           type: object
 *           properties:
 *             comments:
 *               type: integer
 *             favorites:
 *               type: integer
 *             readLater:
 *               type: integer
 *           description: Counts of related entities
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - title
 *         - url
 *         - source
 *         - userId
 *     
 *     ArticleCreate:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: Article title
 *           minLength: 3
 *           maxLength: 500
 *         url:
 *           type: string
 *           format: uri
 *           description: Article URL
 *           maxLength: 500
 *         source:
 *           type: string
 *           description: Article source
 *           minLength: 2
 *           maxLength: 500
 *         originalContent:
 *           oneOf:
 *             - type: object
 *             - type: string
 *               description: JSON string containing original content
 *           description: Original article content
 *         summaryArabic:
 *           type: string
 *           description: Arabic summary of the article
 *           maxLength: 2000
 *         summaryEnglish:
 *           type: string
 *           description: English summary of the article
 *           maxLength: 2000
 *         image:
 *           type: string
 *           format: binary
 *           description: Article image file (multipart/form-data)
 *         categoryId:
 *           type: string
 *           format: uuid
 *           description: Category ID for this article
 *         subType:
 *           type: string
 *           enum: [SPORTS, ECONOMICS, POLITICS]
 *           description: Article sub-type for categorization
 *         pinned:
 *           type: boolean
 *           default: false
 *           description: Whether the article should be pinned
 *         publishedAt:
 *           type: string
 *           format: date-time
 *           description: Publication date (defaults to current time)
 *       required:
 *         - title
 *         - url
 *         - source
 *       example:
 *         title: "Breaking: New Technology Breakthrough"
 *         url: "https://example.com/tech-breakthrough"
 *         source: "TechNews"
 *         originalContent: '{"headline": "Major Discovery", "content": "Full article content..."}'
 *         summaryArabic: "ملخص المقال باللغة العربية"
 *         summaryEnglish: "Article summary in English"
 *         categoryId: "550e8400-e29b-41d4-a716-446655440000"
 *         subType: "ECONOMICS"
 *         pinned: false
 *         publishedAt: "2025-01-10T12:00:00Z"
 *     
 *     ArticleUpdate:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           description: Article title
 *           minLength: 3
 *           maxLength: 500
 *         url:
 *           type: string
 *           format: uri
 *           description: Article URL
 *           maxLength: 500
 *         source:
 *           type: string
 *           description: Article source
 *           minLength: 2
 *           maxLength: 500
 *         originalContent:
 *           oneOf:
 *             - type: object
 *             - type: string
 *               description: JSON string containing original content
 *           description: Original article content
 *         summaryArabic:
 *           type: string
 *           description: Arabic summary of the article
 *           maxLength: 2000
 *         summaryEnglish:
 *           type: string
 *           description: English summary of the article
 *           maxLength: 2000
 *         image:
 *           type: string
 *           format: binary
 *           description: Article image file (multipart/form-data)
 *         categoryId:
 *           type: string
 *           format: uuid
 *           description: Category ID for this article
 *         subType:
 *           type: string
 *           enum: [SPORTS, ECONOMICS, POLITICS]
 *           description: Article sub-type for categorization
 *         pinned:
 *           type: boolean
 *           description: Whether the article should be pinned
 *         publishedAt:
 *           type: string
 *           format: date-time
 *           description: Publication date
 *       example:
 *         title: "Updated: Technology Breakthrough Details"
 *         summaryEnglish: "Updated summary with more details"
 *         subType: "SPORTS"
 *         pinned: true
 *     
 *     PaginatedArticles:
 *       type: object
 *       properties:
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Article'
 *         pagination:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *               example: 1
 *             limit:
 *               type: integer
 *               example: 10
 *             total:
 *               type: integer
 *               example: 150
 *             pages:
 *               type: integer
 *               example: 15
 *         meta:
 *           type: object
 *           properties:
 *             totalArticles:
 *               type: integer
 *               example: 150
 *             currentPage:
 *               type: integer
 *               example: 1
 *             pinnedCount:
 *               type: integer
 *               example: 5
 *     
 *     Comment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         content:
 *           type: string
 *         isDeleted:
 *           type: boolean
 *           default: false
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             name:
 *               type: object
 *             image:
 *               type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 */
