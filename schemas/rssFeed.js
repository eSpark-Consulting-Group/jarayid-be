import Joi from 'joi';

const messages = {
    'string.min': '{{#label}} must be at least {{#limit}} characters long',
    'string.max': '{{#label}} must be at most {{#limit}} characters long',
    'string.uri': '{{#label}} must be a valid URL',
    'string.required': '{{#label}} is required',
    'any.required': '{{#label}} is required',
    'any.only': '{{#label}} must be one of {{#valids}}'
};

// Custom validation for comma-separated UUIDs
const categoryIdValidator = Joi.string().custom((value, helpers) => {
    if (!value) return value;
    
    // Split by comma and validate each ID
    const ids = value.split(',').map(id => id.trim()).filter(id => id.length > 0);
    
    for (const id of ids) {
        // UUID regex pattern
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidPattern.test(id)) {
            return helpers.error('categoryId.invalid', { id });
        }
    }
    
    return value;
}, 'comma-separated UUIDs validation').messages({
    'categoryId.invalid': 'categoryId contains invalid UUID: {{#id}}. All category IDs must be valid UUIDs'
});

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
            .required(),
        subType: Joi.string()
            .valid('SPORTS', 'ECONOMICS', 'POLITICS')
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
        status: Joi.string()
            .valid('DRAFT', 'PUBLISH', 'ARCHIVE')
            .messages(messages),
        categoryId: categoryIdValidator
            .messages(messages),
        subType: Joi.string()
            .valid('SPORTS', 'ECONOMICS', 'POLITICS')
            .messages(messages)
            .optional(),
        search: Joi.string()
            .min(1)
            .max(100)
            .messages(messages)
    }),
    statusQuery: Joi.object({
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
        search: Joi.string()
            .min(1)
            .max(100)
            .messages(messages)
            .optional(),
        status: Joi.string()
            .valid('DRAFT', 'PUBLISH', 'ARCHIVE')
            .messages(messages)
            .optional(),
        categoryId: categoryIdValidator
            .messages(messages)
            .optional(),
        subType: Joi.string()
            .valid('SPORTS', 'ECONOMICS', 'POLITICS')
            .messages(messages)
            .optional(),
        dateFrom: Joi.date()
            .iso()
            .messages(messages)
            .optional(),
        dateTo: Joi.date()
            .iso()
            .min(Joi.ref('dateFrom'))
            .messages({...messages, 'date.min': 'dateTo must be greater than or equal to dateFrom'})
            .optional(),
        sortBy: Joi.string()
            .valid('name', 'status', 'createdAt', 'updatedAt')
            .default('createdAt')
            .messages(messages)
            .optional(),
        sortOrder: Joi.string()
            .valid('asc', 'desc')
            .default('desc')
            .messages(messages)
            .optional()
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
            .messages(messages),
        subType: Joi.string()
            .valid('SPORTS', 'ECONOMICS', 'POLITICS')
            .messages(messages)
            .optional()
    })
};

export default rssFeedSchema;
