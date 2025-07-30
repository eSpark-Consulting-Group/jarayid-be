import Joi from 'joi';

const subscriptionSchema = {
    createCheckout: Joi.object({
        priceId: Joi.string().required().messages({
            'string.empty': 'Price ID is required',
            'any.required': 'Price ID is required'
        }),
        trialDays: Joi.number().integer().min(0).max(365).optional().messages({
            'number.base': 'Trial days must be a number',
            'number.integer': 'Trial days must be an integer',
            'number.min': 'Trial days cannot be negative',
            'number.max': 'Trial days cannot exceed 365'
        }),
        successUrl: Joi.string().uri().optional().messages({
            'string.uri': 'Success URL must be a valid URL'
        }),
        failureUrl: Joi.string().uri().optional().messages({
            'string.uri': 'Failure URL must be a valid URL'
        })
    }),

    createWidgetCheckout: Joi.object({
        priceId: Joi.string().required().messages({
            'string.empty': 'Price ID is required',
            'any.required': 'Price ID is required'
        }),
        trialDays: Joi.number().integer().min(0).max(365).optional().messages({
            'number.base': 'Trial days must be a number',
            'number.integer': 'Trial days must be an integer',
            'number.min': 'Trial days cannot be negative',
            'number.max': 'Trial days cannot exceed 365'
        }),
        checkoutType: Joi.string().valid('widget', 'redirect').default('widget').messages({
            'any.only': 'Checkout type must be either "widget" or "redirect"'
        })
    }),

    createSubscription: Joi.object({
        priceId: Joi.string().required().messages({
            'string.empty': 'Price ID is required',
            'any.required': 'Price ID is required'
        }),
        customerId: Joi.string().optional().messages({
            'string.base': 'Customer ID must be a string'
        }),
        trialDays: Joi.number().integer().min(0).max(365).optional().messages({
            'number.base': 'Trial days must be a number',
            'number.integer': 'Trial days must be an integer',
            'number.min': 'Trial days cannot be negative',
            'number.max': 'Trial days cannot exceed 365'
        })
    }),

    cancelSubscription: Joi.object({
        immediate: Joi.boolean().default(false).messages({
            'boolean.base': 'Immediate must be a boolean value'
        })
    }),

    updateSubscription: Joi.object({
        newPriceId: Joi.string().required().messages({
            'string.empty': 'New price ID is required',
            'any.required': 'New price ID is required'
        })
    }),

    params: Joi.object({
        subscriptionId: Joi.string().uuid().required().messages({
            'string.empty': 'Subscription ID is required',
            'string.uuid': 'Subscription ID must be a valid UUID',
            'any.required': 'Subscription ID is required'
        })
    })
};

export default subscriptionSchema;
