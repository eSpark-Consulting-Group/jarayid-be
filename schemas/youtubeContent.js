import Joi from 'joi';

const youtubeContentSchemas = {
    // Create YouTube Content
    create: Joi.object({
        title: Joi.string()
            .min(3)
            .max(500)
            .required()
            .messages({
                'string.min': 'Title must be at least 3 characters long',
                'string.max': 'Title cannot exceed 500 characters',
                'any.required': 'Title is required'
            }),
        
        youtubeUrl: Joi.string()
            .uri()
            .pattern(/^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/|m\.youtube\.com\/watch\?v=)/)
            .required()
            .messages({
                'string.uri': 'Please provide a valid YouTube URL',
                'string.pattern.base': 'Please provide a valid YouTube URL (youtube.com or youtu.be)',
                'any.required': 'YouTube URL is required'
            }),
        
        contentType: Joi.string()
            .valid('SHORTS', 'FULL_VIDEO')
            .required()
            .messages({
                'any.only': 'Content type must be either SHORTS or FULL_VIDEO',
                'any.required': 'Content type is required'
            }),
        
        categoryId: Joi.string()
            .uuid()
            .required()
            .messages({
                'string.uuid': 'Category ID must be a valid UUID',
                'any.required': 'Category ID is required'
            }),
        
        description: Joi.string()
            .max(2000)
            .allow('')
            .optional()
            .messages({
                'string.max': 'Description cannot exceed 2000 characters'
            }),
        
        thumbnailUrl: Joi.string()
            .uri()
            .allow('')
            .optional()
            .messages({
                'string.uri': 'Thumbnail URL must be a valid URL'
            }),
        
        deviceType: Joi.string()
            .valid('WEB', 'MOBILE', 'BOTH')
            .optional()
            .messages({
                'any.only': 'Device type must be WEB, MOBILE, or BOTH'
            }),
        
        duration: Joi.string()
            .pattern(/^\d{1,2}:\d{2}(:\d{2})?$/)
            .allow('')
            .optional()
            .messages({
                'string.pattern.base': 'Duration must be in format MM:SS or HH:MM:SS'
            }),
        
        isEnabled: Joi.boolean()
            .optional()
            .default(true)
    }),

    // Update YouTube Content
    update: Joi.object({
        title: Joi.string()
            .min(3)
            .max(500)
            .optional()
            .messages({
                'string.min': 'Title must be at least 3 characters long',
                'string.max': 'Title cannot exceed 500 characters'
            }),
        
        youtubeUrl: Joi.string()
            .uri()
            .pattern(/^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/|m\.youtube\.com\/watch\?v=)/)
            .optional()
            .messages({
                'string.uri': 'Please provide a valid YouTube URL',
                'string.pattern.base': 'Please provide a valid YouTube URL (youtube.com or youtu.be)'
            }),
        
        contentType: Joi.string()
            .valid('SHORTS', 'FULL_VIDEO')
            .optional()
            .messages({
                'any.only': 'Content type must be either SHORTS or FULL_VIDEO'
            }),
        
        categoryId: Joi.string()
            .uuid()
            .optional()
            .messages({
                'string.uuid': 'Category ID must be a valid UUID'
            }),
        
        description: Joi.string()
            .max(2000)
            .allow('')
            .optional()
            .messages({
                'string.max': 'Description cannot exceed 2000 characters'
            }),
        
        thumbnailUrl: Joi.string()
            .uri()
            .allow('')
            .optional()
            .messages({
                'string.uri': 'Thumbnail URL must be a valid URL'
            }),
        
        deviceType: Joi.string()
            .valid('WEB', 'MOBILE', 'BOTH')
            .allow('')
            .optional()
            .messages({
                'any.only': 'Device type must be WEB, MOBILE, or BOTH'
            }),
        
        duration: Joi.string()
            .pattern(/^\d{1,2}:\d{2}(:\d{2})?$/)
            .allow('')
            .optional()
            .messages({
                'string.pattern.base': 'Duration must be in format MM:SS or HH:MM:SS'
            }),
        
        isEnabled: Joi.boolean()
            .optional()
    }).min(1).messages({
        'object.min': 'At least one field is required for update'
    }),

    // Query parameters for listing
    query: Joi.object({
        page: Joi.number()
            .integer()
            .min(1)
            .optional()
            .default(1)
            .messages({
                'number.base': 'Page must be a number',
                'number.integer': 'Page must be an integer',
                'number.min': 'Page must be at least 1'
            }),
        
        limit: Joi.number()
            .integer()
            .min(1)
            .max(200)
            .optional()
            .default(20)
            .messages({
                'number.base': 'Limit must be a number',
                'number.integer': 'Limit must be an integer',
                'number.min': 'Limit must be at least 1',
                'number.max': 'Limit cannot exceed 200'
            }),
        
        contentType: Joi.string()
            .valid('SHORTS', 'FULL_VIDEO')
            .optional()
            .messages({
                'any.only': 'Content type must be either SHORTS or FULL_VIDEO'
            }),
        
        categoryId: Joi.string()
            .uuid()
            .optional()
            .messages({
                'string.uuid': 'Category ID must be a valid UUID'
            }),
        
        isEnabled: Joi.boolean()
            .optional(),
        
        deviceType: Joi.string()
            .valid('WEB', 'MOBILE', 'BOTH')
            .optional()
            .messages({
                'any.only': 'Device type must be WEB, MOBILE, or BOTH'
            }),
        
        search: Joi.string()
            .min(2)
            .max(100)
            .optional()
            .messages({
                'string.min': 'Search term must be at least 2 characters',
                'string.max': 'Search term cannot exceed 100 characters'
            }),
        
        sortBy: Joi.string()
            .valid('createdAt', 'updatedAt', 'title', 'viewCount')
            .optional()
            .default('createdAt')
            .messages({
                'any.only': 'Sort by must be one of: createdAt, updatedAt, title, viewCount'
            }),
        
        sortOrder: Joi.string()
            .valid('asc', 'desc')
            .optional()
            .default('desc')
            .messages({
                'any.only': 'Sort order must be either asc or desc'
            })
    }),

    // UUID parameter validation
    params: Joi.object({
        id: Joi.string()
            .uuid()
            .required()
            .messages({
                'string.uuid': 'ID must be a valid UUID',
                'any.required': 'ID is required'
            })
    })
};

export default youtubeContentSchemas;
