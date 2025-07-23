import Joi from 'joi';

// Custom error messages
const messages = {
    'string.min': '{{#label}} must be at least {{#limit}} characters long',
    'string.max': '{{#label}} must be at most {{#limit}} characters long',
    'string.required': '{{#label}} is required',
    'any.required': '{{#label}} is required',
    'string.empty': '{{#label}} cannot be empty'
};

const commentSchema = {
    create: Joi.object({
        articleId: Joi.string()
            .uuid()
            .required()
            .messages(messages),
        content: Joi.string()
            .min(1)
            .max(1000)
            .trim()
            .required()
            .messages({
                ...messages,
                'string.min': 'Comment must not be empty',
                'string.max': 'Comment must be at most 1000 characters long'
            })
    }),
    
    update: Joi.object({
        content: Joi.string()
            .min(1)
            .max(1000)
            .trim()
            .required()
            .messages({
                ...messages,
                'string.min': 'Comment must not be empty',
                'string.max': 'Comment must be at most 1000 characters long'
            })
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
        sortBy: Joi.string()
            .valid('newest', 'oldest')
            .default('newest')
            .messages(messages),
        includeDeleted: Joi.string()
            .valid('true', 'false')
            .default('false')
            .messages(messages)
    }),

    params: Joi.object({
        commentId: Joi.string()
            .uuid()
            .required()
            .messages(messages)
    }),

    articleParams: Joi.object({
        articleId: Joi.string()
            .uuid()
            .required()
            .messages(messages)
    }),

    getComments: Joi.object({
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
        sortBy: Joi.string()
            .valid('newest', 'oldest')
            .default('newest')
            .messages(messages)
    })
};

export default commentSchema;
