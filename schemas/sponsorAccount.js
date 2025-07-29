import Joi from "joi";

// Custom error messages
const messages = {
  "string.min": "{{#label}} must be at least {{#limit}} characters long",
  "string.max": "{{#label}} must be at most {{#limit}} characters long",
  "string.uri": "{{#label}} must be a valid URL",
  "string.email": "{{#label}} must be a valid email",
  "string.required": "{{#label}} is required",
  "number.min": "{{#label}} must be at least {{#limit}}",
  "number.max": "{{#label}} must be at most {{#limit}}",
  "any.required": "{{#label}} is required",
  "any.only": "{{#label}} must be one of {{#valids}}",
};

const sponsorAccountSchema = {
  create: Joi.object({
    name: Joi.string().min(3).max(255).trim().required().messages(messages),

    email: Joi.string().email().max(255).required().messages(messages),

    company: Joi.string().min(2).max(255).required().messages(messages),

    website: Joi.string().uri().max(500).optional().messages(messages),

    logo: Joi.string().optional().messages(messages),

    description: Joi.string().max(2000).optional().messages(messages),
  }),

  update: Joi.object({
    name: Joi.string().min(3).max(255).trim().optional().messages(messages),

    email: Joi.string().email().max(255).optional().messages(messages),

    company: Joi.string().min(2).max(255).optional().messages(messages),

    website: Joi.string().uri().max(500).optional().messages(messages),

    logo: Joi.string().optional().messages(messages),

    description: Joi.string().max(2000).optional().messages(messages),
  }),

  query: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1)
      .messages(messages)
      .optional(),

    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(10)
      .messages(messages)
      .optional(),

    search: Joi.string().min(1).max(100).trim().messages(messages).optional(),
  }),

  params: Joi.object({
    id: Joi.string().uuid().required().messages(messages),
  }),
};

export default sponsorAccountSchema;
