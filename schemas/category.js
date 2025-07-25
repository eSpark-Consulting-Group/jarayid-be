import Joi from 'joi';

// Custom error messages
const messages = {
    'string.min': '{{#label}} must be at least {{#limit}} characters long',
    'string.max': '{{#label}} must be at most {{#limit}} characters long',
    'string.uri': '{{#label}} must be a valid URL',
    'string.required': '{{#label}} is required',
    'number.min': '{{#label}} must be at least {{#limit}}',
    'number.max': '{{#label}} must be at most {{#limit}}',
    'any.required': '{{#label}} is required',
    'any.only': '{{#label}} must be one of {{#valids}}'
};

const categorySchema = {
    create: Joi.object({
        name: Joi.string()
            .min(3)
            .max(500)
            .trim()
            .messages(messages)
            .required(),
        type: Joi.string()
            .valid('COUNTRY', 'NORMAL', 'MEDIA')
            .messages(messages)
            .required(),
        videoUrl: Joi.string()
            .uri()
            .max(500)
            .messages(messages)
            .optional(),
        description: Joi.string()
            .max(2000)
            .messages(messages)
            .optional(),
        seoMeta: Joi.string()
            .messages(messages)
            .optional(),
        thresholdDays: Joi.number()
            .integer()
            .min(1)
            .max(365)
            .default(7)
            .messages(messages)
            .optional()
    }),
    
    update: Joi.object({
        name: Joi.string()
            .min(3)
            .max(500)
            .trim()
            .messages(messages)
            .optional(),
        type: Joi.string()
            .valid('COUNTRY', 'NORMAL', 'MEDIA')
            .messages(messages)
            .optional(),
        videoUrl: Joi.string()
            .uri()
            .max(500)
            .messages(messages)
            .optional(),
        description: Joi.string()
            .max(2000)
            .messages(messages)
            .optional(),
        seoMeta: Joi.string()
            .messages(messages)
            .optional(),
        thresholdDays: Joi.number()
            .integer()
            .min(1)
            .max(365)
            .messages(messages)
            .optional()
    }),

    query: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .default(1)
            .messages(messages)
            .optional(),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(10)
            .messages(messages)
            .optional(),
        type: Joi.string()
            .valid('COUNTRY', 'NORMAL', 'MEDIA')
            .messages(messages)
            .optional(),
        search: Joi.string()
            .min(1)
            .max(100)
            .trim()
            .messages(messages)
            .optional()
    }),

    params: Joi.object({
        id: Joi.string()
            .uuid()
            .messages(messages)
            .required()
    })
};

export default categorySchema;
