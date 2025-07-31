/**
 * @swagger
 * components:
 *   schemas:
 *     VisualAdPlacement:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique visual ad placement ID
 *           example: "ckz123abc456def789ghi012"
 *         platform:
 *           type: string
 *           description: Platform where the ad is displayed
 *           enum: [WEB, APP]
 *           example: "WEB"
 *         mainPage:
 *           type: string
 *           description: Main page identifier or location where the ad appears
 *           example: "HomePageBanner"
 *         articlePage:
 *           type: string
 *           description: Article page identifier where the ad appears
 *           example: "ArticleTopBanner"
 *         category:
 *           type: array
 *           description: List of categories where the ad appears
 *           items:
 *             type: string
 *           example: ["Sports", "Technology"]
 *         adLink:
 *           type: string
 *           format: uri
 *           description: The ad link or ad unit ID
 *           maxLength: 1024
 *           example: "https://example.com/ad-banner"
 *         isActive:
 *           type: boolean
 *           description: Whether the ad placement is active
 *           default: true
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date and time when the ad placement was created
 *           example: "2025-07-29T12:00:00Z"
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date and time when the ad placement was last updated
 *           example: "2025-07-29T14:00:00Z"
 *       required:
 *         - platform
 *         - mainPage
 *         - articlePage
 *         - category
 *
 *     VisualAdPlacementCreate:
 *       type: object
 *       properties:
 *         platform:
 *           type: string
 *           description: Platform where the ad is displayed
 *           enum: [WEB, APP]
 *           example: "WEB"
 *         mainPage:
 *           type: string
 *           description: Main page identifier or location where the ad appears
 *           example: "HomePageBanner"
 *         articlePage:
 *           type: string
 *           description: Article page identifier where the ad appears
 *           example: "ArticleTopBanner"
 *         category:
 *           type: array
 *           description: List of categories where the ad appears
 *           items:
 *             type: string
 *           example: ["Sports", "Technology"]
 *         adLink:
 *           type: string
 *           format: uri
 *           description: The ad link or ad unit ID
 *           maxLength: 1024
 *           example: "https://example.com/ad-banner"
 *         isActive:
 *           type: boolean
 *           description: Whether the ad placement is active
 *           default: true
 *           example: true
 *       required:
 *         - platform
 *         - mainPage
 *         - articlePage
 *         - category
 *
 *     VisualAdPlacementUpdate:
 *       type: object
 *       properties:
 *         platform:
 *           type: string
 *           description: Platform where the ad is displayed
 *           enum: [WEB, APP]
 *           example: "APP"
 *         mainPage:
 *           type: string
 *           description: Main page identifier or location where the ad appears
 *           example: "HomePageBanner"
 *         articlePage:
 *           type: string
 *           description: Article page identifier where the ad appears
 *           example: "ArticleTopBanner"
 *         category:
 *           type: array
 *           description: List of categories where the ad appears
 *           items:
 *             type: string
 *           example: ["Sports", "Technology"]
 *         adLink:
 *           type: string
 *           format: uri
 *           description: The ad link or ad unit ID
 *           maxLength: 1024
 *           example: "https://example.com/ad-footer"
 *         isActive:
 *           type: boolean
 *           description: Whether the ad placement is active
 *           example: false
 */
