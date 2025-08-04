/**
 * @swagger
 * components:
 *   schemas:
 *     RssSummarizationSetting:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Unique identifier for the RSS summarization settings
 *         settings:
 *           type: object
 *           properties:
 *             word_range_15_60:
 *               type: integer
 *               minimum: 0
 *               maximum: 100
 *               description: Percentage weight for summaries with 15–60 words
 *             word_range_61_300:
 *               type: integer
 *               minimum: 0
 *               maximum: 100
 *               description: Percentage weight for summaries with 61–300 words
 *             word_range_301_1000:
 *               type: integer
 *               minimum: 0
 *               maximum: 100
 *               description: Percentage weight for summaries with 301–1000 words
 *             word_range_over_1000:
 *               type: integer
 *               minimum: 0
 *               maximum: 100
 *               description: Percentage weight for summaries over 1000 words
 *             gpt_model:
 *               type: string
 *               enum:
 *                 - gpt-4.1-nano
 *                 - gpt-4o
 *                 - gpt-4.0
 *                 - gpt-4-turbo
 *                 - gpt-4
 *                 - gpt-3.5-turbo
 *                 - gpt-3.5-turbo-instruct
 *               description: Selected GPT model for summarization
 *             category:
 *               type: array
 *               items:
 *                 type: string
 *               description: Array of category names associated with summarization
 *             time_limit:
 *               type: string
 *               enum: [2_days, week, month]
 *               description: Time limit for considering articles for summarization
 *             threshold:
 *               type: integer
 *               minimum: 1
 *               description: Minimum number of articles to trigger summarization
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *       required:
 *         - settings
 *
 *     RssSummarizationSettingCreateOrUpdate:
 *       type: object
 *       properties:
 *         word_range_15_60:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           description: Percentage weight for summaries with 15–60 words
 *         word_range_61_300:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           description: Percentage weight for summaries with 61–300 words
 *         word_range_301_1000:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           description: Percentage weight for summaries with 301–1000 words
 *         word_range_over_1000:
 *           type: integer
 *           minimum: 0
 *           maximum: 100
 *           description: Percentage weight for summaries over 1000 words
 *         gpt_model:
 *           type: string
 *           enum:
 *             - gpt-4.1-nano
 *             - gpt-4o
 *             - gpt-4.0
 *             - gpt-4-turbo
 *             - gpt-4
 *             - gpt-3.5-turbo
 *             - gpt-3.5-turbo-instruct
 *           description: Selected GPT model for summarization
 *         category:
 *           type: array
 *           items:
 *             type: string
 *           description: Array of category names associated with summarization
 *         time_limit:
 *           type: string
 *           enum: [2_days, week, month]
 *           description: Time limit for considering articles for summarization
 *         threshold:
 *           type: integer
 *           minimum: 1
 *           description: Minimum number of articles to trigger summarization
 *       required:
 *         - word_range_15_60
 *         - word_range_61_300
 *         - word_range_301_1000
 *         - word_range_over_1000
 *         - gpt_model
 *         - category
 *         - time_limit
 *         - threshold
 *       example:
 *         word_range_15_60: 20
 *         word_range_61_300: 30
 *         word_range_301_1000: 30
 *         word_range_over_1000: 20
 *         gpt_model: "gpt-4.1-nano"
 *         category: ["Technology", "AI"]
 *         time_limit: "week"
 *         threshold: 5
 */
