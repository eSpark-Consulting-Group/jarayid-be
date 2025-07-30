import Joi from "joi";

// Custom error messages
const messages = {
  "string.base": "{{#label}} must be a string",
  "string.min": "{{#label}} must be at least {{#limit}} characters long",
  "string.max": "{{#label}} must be at most {{#limit}} characters long",
  "any.required": "{{#label}} is required",
};

// API Key schema (used for both create & update since they share the same logic)
const apiKeySchema = Joi.object({
  key: Joi.string().min(10).max(255).trim().required().messages(messages),
});

export default {
  save: apiKeySchema, // For POST /api-key (create or update)
};
