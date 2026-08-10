import Joi from 'joi';

const messages = {
    'string.min': '{{#label}} must be at least {{#limit}} characters long',
    'string.max': '{{#label}} must be at most {{#limit}} characters long',
    'string.uri': '{{#label}} must be a valid URL',
    'string.required': '{{#label}} is required',
    'any.required': '{{#label}} is required',
    'any.only': '{{#label}} must be one of {{#valids}}',
    'date.base': '{{#label}} must be a valid date'
};

const articleSchema = {
    create: Joi.object({
        title: Joi.string()
            .min(3)
            .max(500)
            .messages(messages)
            .required(),
        url: Joi.string()
            .uri()
            .max(500)
            .messages(messages)
            .optional(),
        source: Joi.string()
            .min(2)
            .max(500)
            .messages(messages)
            .required(),
        originalContent: Joi.alternatives()
            .try(
                Joi.object(),
                Joi.string().custom((value, helpers) => {
                    try {
                        JSON.parse(value);
                        return value;
                    } catch (error) {
                        return helpers.error('originalContent.invalid');
                    }
                })
            )
            .messages({...messages, 'originalContent.invalid': 'Original content must be valid JSON'})
            .optional(),
        summaryArabic: Joi.string()
            .max(2000)
            .messages(messages)
            .optional(),
        summaryEnglish: Joi.string()
            .max(2000)
            .messages(messages)
            .optional(),
        categoryId: Joi.string()
            .uuid()
            .messages(messages)
            .optional(),
        subType: Joi.string()
            .valid('SPORTS', 'ECONOMICS', 'POLITICS')
            .messages(messages)
            .optional(),
        rssFeedId: Joi.string()
            .uuid()
            .messages(messages)
            .optional(),
        status: Joi.boolean()
            .default(true)
            .messages(messages)
            .optional(),
        pinned: Joi.boolean()
            .default(false)
            .messages(messages)
            .optional(),
        publishedAt: Joi.date()
            .iso()
            .messages(messages)
            .optional()
    }),

    update: Joi.object({
        title: Joi.string()
            .min(3)
            .max(500)
            .messages(messages)
            .optional(),
        url: Joi.string()
            .uri()
            .max(500)
            .messages(messages)
            .optional(),
        source: Joi.string()
            .min(2)
            .max(500)
            .messages(messages)
            .optional(),
        originalContent: Joi.alternatives()
            .try(
                Joi.object(),
                Joi.string().custom((value, helpers) => {
                    try {
                        JSON.parse(value);
                        return value;
                    } catch (error) {
                        return helpers.error('originalContent.invalid');
                    }
                })
            )
            .messages({...messages, 'originalContent.invalid': 'Original content must be valid JSON'})
            .optional(),
        summaryArabic: Joi.string()
            .max(2000)
            .messages(messages)
            .optional(),
        summaryEnglish: Joi.string()
            .max(2000)
            .messages(messages)
            .optional(),
        categoryId: Joi.string()
            .uuid()
            .messages(messages)
            .optional(),
        subType: Joi.string()
            .valid('SPORTS', 'ECONOMICS', 'POLITICS')
            .messages(messages)
            .optional(),
        rssFeedId: Joi.string()
            .uuid()
            .messages(messages)
            .optional(),
        status: Joi.boolean()
            .messages(messages)
            .optional(),
        pinned: Joi.boolean()
            .messages(messages)
            .optional(),
        publishedAt: Joi.date()
            .iso()
            .messages(messages)
            .optional()
    }),

    params: Joi.object({
        id: Joi.string()
            .uuid()
            .messages(messages)
            .required()
    }),

    bulkDelete: Joi.object({
        articleIds: Joi.array()
            .items(Joi.string().uuid().messages(messages))
            .min(1)
            .max(100)
            .unique()
            .messages({
                ...messages,
                'array.min': 'At least one article ID is required',
                'array.max': 'Cannot delete more than 100 articles at once',
                'array.unique': 'Duplicate article IDs are not allowed'
            })
            .required()
    }),

    query: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .default(1)
            .messages(messages),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(200)
            .default(10)
            .messages(messages),
        categoryId: Joi.string()
            .uuid()
            .messages(messages),
        subType: Joi.string()
            .valid('SPORTS', 'ECONOMICS', 'POLITICS')
            .messages(messages)
            .optional(),
        pinned: Joi.boolean()
            .messages(messages),
        search: Joi.string()
            .min(1)
            .max(100)
            .messages(messages),
        status: Joi.alternatives()
            .try(
                Joi.boolean(),
                Joi.string().valid('true', 'false')
            )
            .messages(messages),
        trackViews: Joi.boolean()
            .default(false)
            .messages(messages),
        // New sorting parameters
        sortBy: Joi.string()
            .valid('title', 'publishedAt', 'createdAt', 'viewCount', 'source', 'pinned')
            .default('publishedAt')
            .messages(messages)
            .optional(),
        sortOrder: Joi.string()
            .valid('asc', 'desc')
            .default('desc')
            .messages(messages)
            .optional(),
        // Date range filters for publishedAt
        dateFrom: Joi.date()
            .iso()
            .messages(messages)
            .optional(),
        dateTo: Joi.date()
            .iso()
            .min(Joi.ref('dateFrom'))
            .messages({...messages, 'date.min': 'dateTo must be greater than or equal to dateFrom'})
            .optional(),
        // Date range filters for createdAt
        createdFrom: Joi.date()
            .iso()
            .messages(messages)
            .optional(),
        createdTo: Joi.date()
            .iso()
            .min(Joi.ref('createdFrom'))
            .messages({...messages, 'date.min': 'createdTo must be greater than or equal to createdFrom'})
            .optional()
    })
};

export default articleSchema;
