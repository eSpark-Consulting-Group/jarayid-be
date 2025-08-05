import Joi from "joi";

// Custom error messages
const messages = {
  "string.base": "{{#label}} must be a string",
  "string.min": "{{#label}} must be at least {{#limit}} characters long",
  "string.max": "{{#label}} must be at most {{#limit}} characters long",
  "string.uri": "{{#label}} must be a valid URL",
  "array.base": "{{#label}} must be an array",
  "array.min": "{{#label}} must contain at least {{#limit}} items",
  "any.required": "{{#label}} is required",
  "any.only": "{{#label}} must be one of {{#valids}}",
  "number.min": "{{#label}} must be at least {{#limit}}",
  "number.max": "{{#label}} must be at most {{#limit}}",
  "boolean.base": "{{#label}} must be true or false",
};

const visualAdPlacementSchema = {
  // Create schema
  create: Joi.object({
    platform: Joi.string().valid("WEB", "APP").required().messages(messages),

    mainPage: Joi.string().min(1).max(255).trim().required().messages(messages),

    articlePage: Joi.string()
      .min(1)
      .max(255)
      .trim()
      .required()
      .messages(messages),

    category: Joi.array()
      .items(Joi.string().min(1).max(255).messages(messages))
      .min(1)
      .required()
      .messages(messages),

    adLink: Joi.string().uri().max(1024).optional().messages(messages),

    isActive: Joi.boolean().default(true).messages(messages),
  }),

  // Update schema
  update: Joi.object({
    platform: Joi.string().valid("WEB", "APP").optional().messages(messages),

    mainPage: Joi.string().min(1).max(255).trim().optional().messages(messages),

    articlePage: Joi.string()
      .min(1)
      .max(255)
      .trim()
      .optional()
      .messages(messages),

    category: Joi.array()
      .items(Joi.string().min(1).max(255).messages(messages))
      .min(1)
      .optional()
      .messages(messages),

    adLink: Joi.string().uri().max(1024).optional().messages(messages),

    isActive: Joi.boolean().optional().messages(messages),
  }),

  // Query parameters schema
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

  // Path parameters schema
  params: Joi.object({
    id: Joi.string().guid({ version: "uuidv4" }).required().messages({
      "string.base": "ID must be a string",
      "string.guid": "ID must be a valid UUID",
      "any.required": "ID is required",
    }),
  }),
};

export default visualAdPlacementSchema;
