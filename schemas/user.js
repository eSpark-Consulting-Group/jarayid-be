import Joi from 'joi';

// Custom error messages
const messages = {
    'string.min': '{{#label}} must be at least {{#limit}} characters long',
    'string.max': '{{#label}} must be at most {{#limit}} characters long',
    'string.email': '{{#label}} must be a valid email address',
    'string.required': '{{#label}} is required',
    'string.pattern.base': '{{#label}} must match the pattern {{#pattern}}',
    'any.required': '{{#label}} is required'
};

const userSchema = {
    create: Joi.object({
        name: Joi.string()
            .min(2)
            .max(100)
            .messages(messages)
            .optional(), // Made optional
        email: Joi.string()
            .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'io', 'edu', 'gov', 'co'] } })
            .messages(messages)
            .required(),
        loginType: Joi.string()
            .valid('local', 'google', 'github', 'facebook', 'apple')
            .default('local')
            .messages(messages),
        password: Joi.string()
            .min(8)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .messages({
                ...messages,
                'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
            })
            .when('loginType', {
                is: 'local',
                then: Joi.required(),
                otherwise: Joi.optional()
            }),
        socialId: Joi.string()
            .max(500)
            .messages(messages)
            .when('loginType', {
                is: 'local',
                then: Joi.forbidden(),
                otherwise: Joi.required()
            }),
        image: Joi.string()
            .uri()
            .max(500)
            .messages(messages)
            .optional() // Optional image URL for social login
    }),
    update: Joi.object({
        name: Joi.string()
            .min(3)
            .max(30)
            .pattern(/^[a-zA-Z\s]+$/)
            .messages(messages),
        country: Joi.string()
            .max(100)
            .messages(messages),
        phoneNumber: Joi.string()
            .pattern(/^\+?[1-9]\d{1,14}$/)
            .messages({
                ...messages,
                'string.pattern.base': 'Phone number must be a valid international format (10-15 digits, optional + prefix)'
            })
            .optional()
    }),
    login: Joi.object({
        email: Joi.string()
            .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'io'] } })
            .messages(messages)
            .required(),
        loginType: Joi.string().valid('local', 'google', 'github').default('local'),
        password: Joi.when('loginType', {   
            is: 'local',
            then: Joi.string()
                .min(8)
                .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
                .messages({
                    ...messages,
                    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
                })
                .required(),
            otherwise: Joi.forbidden()
        })
    }),
    forgotPassword: Joi.object({
        email: Joi.string()
            .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'io'] } })
            .messages(messages)
            .required()
    }),
    verifyResetToken: Joi.object({
        token: Joi.string()
            .required()
            .messages(messages)
    }),
    resetPassword: Joi.object({
        token: Joi.string()
            .required()
            .messages(messages),
        newPassword: Joi.string()
            .min(8)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .messages({
                ...messages,
                'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
            })
            .required()
    }),
    setPassword: Joi.object({
        currentPassword: Joi.string()
            .min(8)
            .required()
            .messages(messages),
        newPassword: Joi.string()
            .min(8)
            .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .messages({
                ...messages,
                'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'
            })
            .required()
    }),
    
    // Admin validation schemas
    adminGetUsers: Joi.object({
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
            .max(255)
            .messages(messages)
            .optional(),
        role: Joi.string()
            .valid('USER', 'ADMIN')
            .messages(messages)
            .optional(),
        isBanned: Joi.boolean()
            .messages(messages)
            .optional(),
        isSocialLogin: Joi.boolean()
            .messages(messages)
            .optional(),
        subscriptionStatus: Joi.string()
            .valid('free', 'trial', 'premium')
            .messages(messages)
            .optional(),
        sortBy: Joi.string()
            .valid('createdAt', 'updatedAt', 'email', 'name')
            .default('createdAt')
            .messages(messages),
        sortOrder: Joi.string()
            .valid('asc', 'desc')
            .default('desc')
            .messages(messages),
        from: Joi.string()
            .pattern(/^\d{4}-\d{2}-\d{2}$/)
            .messages({
                ...messages,
                'string.pattern.base': 'from date must be in YYYY-MM-DD format'
            })
            .optional(),
        to: Joi.string()
            .pattern(/^\d{4}-\d{2}-\d{2}$/)
            .messages({
                ...messages,
                'string.pattern.base': 'to date must be in YYYY-MM-DD format'
            })
            .optional()
    }).custom((value, helpers) => {
        // Custom validation to ensure 'from' date is not later than 'to' date
        if (value.from && value.to) {
            const fromDate = new Date(value.from);
            const toDate = new Date(value.to);
            
            if (fromDate > toDate) {
                return helpers.error('custom.dateRange', { 
                    message: '"from" date cannot be later than "to" date' 
                });
            }
        }
        return value;
    }, 'Date range validation'),
    
    adminToggleBan: Joi.object({
        reason: Joi.string()
            .max(500)
            .messages(messages)
            .optional()
    }),
    
    adminUserStats: Joi.object({
        period: Joi.string()
            .valid('7d', '30d', '90d', 'all')
            .default('30d')
            .messages(messages)
    })
};

export default userSchema;
