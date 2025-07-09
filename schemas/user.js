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
            .messages(messages)
    }),
    update: Joi.object({
        name: Joi.string()
            .min(3)
            .max(30)
            .pattern(/^[a-zA-Z\s]+$/)
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
    })
};

export default userSchema;
