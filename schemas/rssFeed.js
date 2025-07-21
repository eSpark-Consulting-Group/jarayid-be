import Joi from 'joi';

const messages = {
    'string.min': '{{#label}} must be at least {{#limit}} characters long',
    'string.max': '{{#label}} must be at most {{#limit}} characters long',
    'string.uri': '{{#label}} must be a valid URL',
    'string.required': '{{#label}} is required',
    'any.required': '{{#label}} is required',
    'any.only': '{{#label}} must be one of {{#valids}}'
};

const rssFeedSchema = {
    create: Joi.object({
        name: Joi.string()
            .min(3)
            .max(500)
            .messages(messages)
            .required(),
        url: Joi.string()
            .uri()
            .max(500)
            .messages(messages)
            .required(),
        status: Joi.string()
            .valid('DRAFT', 'PUBLISH', 'ARCHIVE')
            .default('DRAFT')
            .messages(messages),
        categoryId: Joi.string()
            .uuid()
            .messages(messages)
            .required()
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
        status: Joi.string()
            .valid('DRAFT', 'PUBLISH', 'ARCHIVE')
            .messages(messages),
        categoryId: Joi.string()
            .uuid()
            .messages(messages),
        search: Joi.string()
            .min(1)
            .max(100)
            .messages(messages)
    }),
    update: Joi.object({
        name: Joi.string()
            .min(3)
            .max(500)
            .messages(messages),
        url: Joi.string()
            .uri()
            .max(500)
            .messages(messages),
        status: Joi.string()
            .valid('DRAFT', 'PUBLISH', 'ARCHIVE')
            .messages(messages),
        categoryId: Joi.string()
            .uuid()
            .messages(messages)
    })
};

export default rssFeedSchema;
