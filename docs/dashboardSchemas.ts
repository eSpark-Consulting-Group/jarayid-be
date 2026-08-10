/**
 * @swagger
 * components:
 *   schemas:
 *     DashboardOverview:
 *       type: object
 *       properties:
 *         totalArticles:
 *           type: integer
 *           example: 14589
 *         activeUsers:
 *           type: integer
 *           example: 300
 *         totalCategories:
 *           type: integer
 *           example: 60
 *         pageViews:
 *           type: integer
 *           example: 12400
 *         articlesChangePercent:
 *           type: number
 *           example: 8
 *         usersChangePercent:
 *           type: number
 *           example: 5
 *         categoriesChangePercent:
 *           type: number
 *           example: 1.2
 *         viewsChangePercent:
 *           type: number
 *           example: 25

 *     SystemStatusItem:
 *       type: object
 *       properties:
 *         service:
 *           type: string
 *           example: "RSS Aggregation"
 *         status:
 *           type: string
 *           enum: [Healthy, Warning, Down]
 *           example: "Healthy"

 *     ArticlePublishingTrend:
 *       type: object
 *       properties:
 *         day:
 *           type: string
 *           example: "Monday"
 *         count:
 *           type: integer
 *           example: 80

 *     PageViewTrend:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           example: "2025-08-01"
 *         thisMonthViews:
 *           type: integer
 *           example: 4504
 *         lastMonthViews:
 *           type: integer
 *           example: 3004

 *     RecentArticle:
 *       type: object
 *       properties:
 *         title:
 *           type: string
 *           example: "Climate Change Global Impact"
 *         views:
 *           type: integer
 *           example: 856
 *         publishedAt:
 *           type: string
 *           format: date-time
 *           example: "2025-08-03T14:32:00Z"
 *         status:
 *           type: string
 *           enum: [Published, Draft]
 *           example: "Published"

 *     DashboardResponse:
 *       type: object
 *       properties:
 *         overview:
 *           $ref: '#/components/schemas/DashboardOverview'
 *         systemStatus:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SystemStatusItem'
 *         articlePublishingTrends:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ArticlePublishingTrend'
 *         pageViewTrends:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/PageViewTrend'
 *         recentArticles:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RecentArticle'
 */
