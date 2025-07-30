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
 *         pageType:
 *           type: string
 *           description: Type of page where the ad appears
 *           enum: [MAIN_PAGE, ARTICLE_PAGE, CATEGORY]
 *           example: "MAIN_PAGE"
 *         positionName:
 *           type: string
 *           description: Specific position name for the ad placement
 *           minLength: 3
 *           maxLength: 255
 *           example: "Header Banner"
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
 *         - pageType
 *         - positionName
 *
 *     VisualAdPlacementCreate:
 *       type: object
 *       properties:
 *         platform:
 *           type: string
 *           description: Platform where the ad is displayed
 *           enum: [WEB, APP]
 *           example: "WEB"
 *         pageType:
 *           type: string
 *           description: Type of page where the ad appears
 *           enum: [MAIN_PAGE, ARTICLE_PAGE, CATEGORY]
 *           example: "MAIN_PAGE"
 *         positionName:
 *           type: string
 *           description: Specific position name for the ad placement
 *           minLength: 3
 *           maxLength: 255
 *           example: "Sidebar Top"
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
 *         - pageType
 *         - positionName
 *
 *     VisualAdPlacementUpdate:
 *       type: object
 *       properties:
 *         platform:
 *           type: string
 *           description: Platform where the ad is displayed
 *           enum: [WEB, APP]
 *           example: "APP"
 *         pageType:
 *           type: string
 *           description: Type of page where the ad appears
 *           enum: [MAIN_PAGE, ARTICLE_PAGE, CATEGORY]
 *           example: "ARTICLE_PAGE"
 *         positionName:
 *           type: string
 *           description: Specific position name for the ad placement
 *           minLength: 3
 *           maxLength: 255
 *           example: "Footer Banner"
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
