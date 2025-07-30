import Joi from 'joi';

// Cookie categories enum for validation
const COOKIE_CATEGORIES = ['ESSENTIAL', 'FUNCTIONAL', 'ANALYTICS', 'MARKETING', 'PREFERENCES'];

const cookieSchema = {
    create: Joi.object({
        name: Joi.string()
            .min(2)
            .max(100)
            .required()
            .pattern(/^[a-zA-Z0-9_-]+$/)
            .messages({
                'string.min': 'Cookie name must be at least 2 characters long',
                'string.max': 'Cookie name cannot exceed 100 characters',
                'string.pattern.base': 'Cookie name can only contain letters, numbers, hyphens, and underscores',
                'any.required': 'Cookie name is required'
            }),
        purpose: Joi.string()
            .min(10)
            .max(500)
            .required()
            .messages({
                'string.min': 'Purpose must be at least 10 characters long',
                'string.max': 'Purpose cannot exceed 500 characters',
                'any.required': 'Purpose is required'
            }),
        duration: Joi.string()
            .min(1)
            .max(50)
            .required()
            .messages({
                'string.min': 'Duration is required',
                'string.max': 'Duration cannot exceed 50 characters',
                'any.required': 'Duration is required'
            }),
        category: Joi.string()
            .valid(...COOKIE_CATEGORIES)
            .default('FUNCTIONAL')
            .messages({
                'any.only': `Category must be one of: ${COOKIE_CATEGORIES.join(', ')}`
            }),
        isEssential: Joi.boolean()
            .default(false)
            .messages({
                'boolean.base': 'isEssential must be a boolean value'
            }),
        isEnabled: Joi.boolean()
            .default(true)
            .messages({
                'boolean.base': 'isEnabled must be a boolean value'
            }),
        description: Joi.string()
            .max(1000)
            .optional()
            .allow('')
            .messages({
                'string.max': 'Description cannot exceed 1000 characters'
            })
    }),

    update: Joi.object({
        name: Joi.string()
            .min(2)
            .max(100)
            .pattern(/^[a-zA-Z0-9_-]+$/)
            .optional()
            .messages({
                'string.min': 'Cookie name must be at least 2 characters long',
                'string.max': 'Cookie name cannot exceed 100 characters',
                'string.pattern.base': 'Cookie name can only contain letters, numbers, hyphens, and underscores'
            }),
        purpose: Joi.string()
            .min(10)
            .max(500)
            .optional()
            .messages({
                'string.min': 'Purpose must be at least 10 characters long',
                'string.max': 'Purpose cannot exceed 500 characters'
            }),
        duration: Joi.string()
            .min(1)
            .max(50)
            .optional()
            .messages({
                'string.min': 'Duration is required',
                'string.max': 'Duration cannot exceed 50 characters'
            }),
        category: Joi.string()
            .valid(...COOKIE_CATEGORIES)
            .optional()
            .messages({
                'any.only': `Category must be one of: ${COOKIE_CATEGORIES.join(', ')}`
            }),
        isEssential: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isEssential must be a boolean value'
            }),
        isEnabled: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isEnabled must be a boolean value'
            }),
        description: Joi.string()
            .max(1000)
            .optional()
            .allow('')
            .messages({
                'string.max': 'Description cannot exceed 1000 characters'
            })
    }).min(1).messages({
        'object.min': 'At least one field must be provided for update'
    }),

    query: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .default(1)
            .messages({
                'number.min': 'Page must be at least 1'
            }),
        limit: Joi.number()
            .integer()
            .min(1)
            .max(100)
            .default(10)
            .messages({
                'number.min': 'Limit must be at least 1',
                'number.max': 'Limit cannot exceed 100'
            }),
        category: Joi.string()
            .valid(...COOKIE_CATEGORIES)
            .optional()
            .messages({
                'any.only': `Category must be one of: ${COOKIE_CATEGORIES.join(', ')}`
            }),
        isEssential: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isEssential must be a boolean value'
            }),
        isEnabled: Joi.boolean()
            .optional()
            .messages({
                'boolean.base': 'isEnabled must be a boolean value'
            }),
        search: Joi.string()
            .max(255)
            .optional()
            .messages({
                'string.max': 'Search term cannot exceed 255 characters'
            }),
        sortBy: Joi.string()
            .valid('name', 'purpose', 'category', 'duration', 'createdAt', 'updatedAt')
            .default('createdAt')
            .messages({
                'any.only': 'sortBy must be one of: name, purpose, category, duration, createdAt, updatedAt'
            }),
        sortOrder: Joi.string()
            .valid('asc', 'desc')
            .default('desc')
            .messages({
                'any.only': 'sortOrder must be either asc or desc'
            })
    }),

    params: Joi.object({
        id: Joi.string()
            .uuid()
            .required()
            .messages({
                'string.uuid': 'Cookie ID must be a valid UUID',
                'any.required': 'Cookie ID is required'
            })
    }),

    bulkUpdate: Joi.object({
        cookieIds: Joi.array()
            .items(
                Joi.string()
                    .uuid()
                    .required()
                    .messages({
                        'string.uuid': 'Each cookie ID must be a valid UUID',
                        'any.required': 'Cookie ID is required'
                    })
            )
            .min(1)
            .max(50)
            .required()
            .messages({
                'array.min': 'At least one cookie ID is required',
                'array.max': 'Cannot update more than 50 cookies at once',
                'any.required': 'Cookie IDs array is required'
            }),
        updates: Joi.object({
            category: Joi.string()
                .valid(...COOKIE_CATEGORIES)
                .optional()
                .messages({
                    'any.only': `Category must be one of: ${COOKIE_CATEGORIES.join(', ')}`
                }),
            isEnabled: Joi.boolean()
                .optional()
                .messages({
                    'boolean.base': 'isEnabled must be a boolean value'
                }),
            purpose: Joi.string()
                .min(10)
                .max(500)
                .optional()
                .messages({
                    'string.min': 'Purpose must be at least 10 characters long',
                    'string.max': 'Purpose cannot exceed 500 characters'
                }),
            duration: Joi.string()
                .min(1)
                .max(50)
                .optional()
                .messages({
                    'string.min': 'Duration is required',
                    'string.max': 'Duration cannot exceed 50 characters'
                }),
            description: Joi.string()
                .max(1000)
                .optional()
                .allow('')
                .messages({
                    'string.max': 'Description cannot exceed 1000 characters'
                })
        }).min(1).required().messages({
            'object.min': 'At least one update field must be provided',
            'any.required': 'Updates object is required'
        })
    })
};

export default cookieSchema;
