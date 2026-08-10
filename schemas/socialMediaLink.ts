import Joi from 'joi';

// Define valid social media types
const socialMediaTypes = [
  'FACEBOOK',
  'TWITTER', 
  'INSTAGRAM',
  'LINKEDIN',
  'YOUTUBE',
  'TIKTOK',
  'SNAPCHAT',
  'PINTEREST',
  'WHATSAPP',
  'TELEGRAM',
  'DISCORD',
  'REDDIT',
  'GITHUB',
  'WEBSITE',
  'OTHER'
];

// Create social media link validation schema
const createSocialMediaLinkSchema = Joi.object({
  categoryName: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Category name is required',
      'string.min': 'Category name must have at least 1 character',
      'string.max': 'Category name cannot exceed 100 characters',
      'any.required': 'Category name is required'
    }),
  
  link: Joi.string()
    .trim()
    .uri({ scheme: ['http', 'https'] })
    .max(500)
    .required()
    .messages({
      'string.empty': 'Link is required',
      'string.uri': 'Link must be a valid URL (http or https)',
      'string.max': 'Link cannot exceed 500 characters',
      'any.required': 'Link is required'
    }),
  
  socialMedia: Joi.string()
    .valid(...socialMediaTypes)
    .required()
    .messages({
      'any.only': `Social media type must be one of: ${socialMediaTypes.join(', ')}`,
      'any.required': 'Social media type is required'
    }),
  
  isActive: Joi.boolean()
    .default(true)
    .messages({
      'boolean.base': 'isActive must be a boolean value'
    })
});

// Update social media link validation schema
const updateSocialMediaLinkSchema = Joi.object({
  categoryName: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.empty': 'Category name cannot be empty',
      'string.min': 'Category name must have at least 1 character',
      'string.max': 'Category name cannot exceed 100 characters'
    }),
  
  link: Joi.string()
    .trim()
    .uri({ scheme: ['http', 'https'] })
    .max(500)
    .optional()
    .messages({
      'string.empty': 'Link cannot be empty',
      'string.uri': 'Link must be a valid URL (http or https)',
      'string.max': 'Link cannot exceed 500 characters'
    }),
  
  socialMedia: Joi.string()
    .valid(...socialMediaTypes)
    .optional()
    .messages({
      'any.only': `Social media type must be one of: ${socialMediaTypes.join(', ')}`
    }),
  
  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isActive must be a boolean value'
    })
});

// Query parameters validation for filtering
const getSocialMediaLinksQuerySchema = Joi.object({
  categoryName: Joi.string()
    .trim()
    .max(100)
    .optional()
    .messages({
      'string.max': 'Category name filter cannot exceed 100 characters'
    }),
  
  socialMedia: Joi.string()
    .valid(...socialMediaTypes)
    .optional()
    .messages({
      'any.only': `Social media type filter must be one of: ${socialMediaTypes.join(', ')}`
    }),
  
  isActive: Joi.boolean()
    .optional()
    .messages({
      'boolean.base': 'isActive filter must be a boolean value'
    }),
  
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional()
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10)
    .optional()
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    })
});

// UUID validation for social media link ID
const socialMediaLinkIdSchema = Joi.object({
  id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': 'Invalid social media link ID format',
      'any.required': 'Social media link ID is required'
    })
});

export default {
  create: createSocialMediaLinkSchema,
  update: updateSocialMediaLinkSchema,
  query: getSocialMediaLinksQuerySchema,
  params: socialMediaLinkIdSchema,
  createSocialMediaLinkSchema,
  updateSocialMediaLinkSchema,
  getSocialMediaLinksQuerySchema,
  socialMediaLinkIdSchema,
  socialMediaTypes
};
