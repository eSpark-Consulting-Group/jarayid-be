import Joi from "joi";

// Custom error messages
const messages = {
  "string.base": "{{#label}} must be a string",
  "string.min": "{{#label}} must be at least {{#limit}} characters long",
  "string.max": "{{#label}} must be at most {{#limit}} characters long",
  "string.guid": "{{#label}} must be a valid UUID",
  "any.required": "{{#label}} is required",
};

// API Key schema
const apiKeySchema = {
  // Create schema
  create: Joi.object({
    key: Joi.string().min(10).max(255).trim().required().messages(messages),
  }),

  // Update schema (only key can be updated)
  update: Joi.object({
    key: Joi.string().min(10).max(255).trim().optional().messages(messages),
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

export default apiKeySchema;
