import Joi from "joi";

const messages = {
  "string.base": "{{#label}} must be a string",
  "string.required": "{{#label}} is required",
  "string.min": "{{#label}} must be at least {{#limit}} characters long",
  "string.max": "{{#label}} must be at most {{#limit}} characters long",
  "string.empty": "{{#label}} is required",
  "string.pattern.base":
    "{{#label}} must be a valid slug (lowercase letters, numbers, hyphens)",
  "any.required": "{{#label}} is required",
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const staticPageSchema = {
  
  create: Joi.object({
    
    title: Joi.string().max(100).label("title").messages(messages).required(),

    slug: Joi.string()
      .max(100)
      .pattern(slugPattern)
      .label("slug")
      .messages(messages)
      .required(),

    content: Joi.json()
      .label("content")
      .messages(messages)
      .required(),
  }),

  update: Joi.object({
    
    title: Joi.string().max(100).label("title").messages(messages),

    slug: Joi.string()
      .max(100)
      .pattern(slugPattern)
      .label("slug")
      .messages(messages),

    content: Joi.json()
      .label("content")
      .messages(messages),
  }),

  params: Joi.object({
    id: Joi.string()
      .guid({ version: ["uuidv4"] })
      .required()
      .messages(messages),
  }),
  
  query: Joi.object({
    
    page: Joi
      .number()
      .integer()
      .min(1)
      .default(1),
    
    limit: Joi
      .number()
      .integer()
      .min(1)
      .max(100)
      .default(10),
    
    search: Joi
      .string()
      .min(1)
      .max(100)
      .optional(),
  }),
};

export default staticPageSchema;
