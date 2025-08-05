import Joi from "joi";

// Custom error messages
const messages = {
  "string.base": "{{#label}} must be a string",
  "string.min": "{{#label}} must be at least {{#limit}} characters long",
  "string.max": "{{#label}} must be at most {{#limit}} characters long",
  "string.uri": "{{#label}} must be a valid URL",
  "string.email": "{{#label}} must be a valid email",
  "string.pattern.base": "{{#label}} format is invalid",
  "any.required": "{{#label}} is required",
  "any.only": "{{#label}} must be one of {{#valids}}",
  "number.min": "{{#label}} must be at least {{#limit}}",
  "number.max": "{{#label}} must be at most {{#limit}}",
};

const statusEnum = ["ACTIVE", "INACTIVE", "SUSPENDED"];

const sponsorAccountSchema = {
  create: Joi.object({
    name: Joi.string().min(3).max(200).trim().required().messages(messages),

    businessName: Joi.string().min(3).max(200).required().messages(messages),

    website: Joi.string().uri().max(500).optional().messages(messages),

    contactEmail: Joi.string().email().max(200).required().messages(messages),

    category: Joi.string().max(100).required().messages(messages),

    contact: Joi.string().optional().messages(messages),

    status: Joi.string()
      .valid(...statusEnum)
      .default("ACTIVE")
      .messages(messages),

    phone: Joi.string()
      .max(20)
      .pattern(/^[0-9+\-() ]*$/)
      .optional()
      .messages(messages),
  }),

  update: Joi.object({
    name: Joi.string().min(3).max(200).trim().optional().messages(messages),

    businessName: Joi.string().min(3).max(200).optional().messages(messages),

    website: Joi.string().uri().max(500).optional().messages(messages),

    contactEmail: Joi.string().email().max(200).optional().messages(messages),

    category: Joi.string().max(100).optional().messages(messages),

    contact: Joi.string().optional().messages(messages),

    status: Joi.string()
      .valid(...statusEnum)
      .optional()
      .messages(messages),

    phone: Joi.string()
      .max(20)
      .pattern(/^[0-9+\-() ]*$/)
      .optional()
      .messages(messages),
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
