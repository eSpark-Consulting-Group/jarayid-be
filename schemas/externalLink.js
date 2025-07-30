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
  "boolean.base": "{{#label}} must be true or false",
};

const externalLinkSchema = {
  // Create schema
  create: Joi.object({
    toolName: Joi.string().min(3).max(255).trim().required().messages(messages),

    toolRedirectLink: Joi.string()
      .uri()
      .max(1024)
      .required()
      .messages(messages),

    status: Joi.string()
      .valid("ACTIVE", "INACTIVE")
      .default("ACTIVE")
      .messages(messages),
  }),

  // Update schema
  update: Joi.object({
    toolName: Joi.string().min(3).max(255).trim().optional().messages(messages),

    toolRedirectLink: Joi.string()
      .uri()
      .max(1024)
      .optional()
      .messages(messages),

    status: Joi.string()
      .valid("ACTIVE", "INACTIVE")
      .default("ACTIVE")
      .optional()
      .messages(messages),
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

export default externalLinkSchema;
