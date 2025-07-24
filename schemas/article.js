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

    query: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .default(1)
            .messages(messages),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
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
        status: Joi.string()
            .valid('published', 'draft')
            .messages(messages),
        trackViews: Joi.boolean()
            .default(false)
            .messages(messages)
    })
};

export default articleSchema;
