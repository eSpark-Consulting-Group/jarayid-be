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
            .min(3)
            .max(30)
            .pattern(/^[a-zA-Z\s]+$/)
            .messages(messages)
            .required(),
        email: Joi.string()
            .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'io'] } })
            .messages(messages)
            .required(),
        loginType: Joi.string()
            .valid('local', 'google', 'github')
            .default('local')
            .messages(messages),
        password: Joi.string()
            .min(8)
            .messages(messages)
            .when('loginType', {
                is: 'local',
                then: Joi.required(),
                otherwise: Joi.forbidden()
            })
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
    }),
    login: Joi.object({
        email: Joi.string()
            .email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'org', 'io'] } })
            .messages(messages)
            .required(),
        loginType: Joi.string().valid('local', 'google', 'github').default('local'),
        password: Joi.when('loginType', {   
            is: 'local',
            then: Joi.string().min(8).messages(messages).required(),
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
    })
};

export default userSchema;
