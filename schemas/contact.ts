import Joi from "joi";

const messages = {
  "string.base": "{{#label}} must be a string",
  "string.empty": "{{#label}} is required",
  "string.min": "{{#label}} must be at least {{#limit}} characters long",
  "string.max": "{{#label}} must be at most {{#limit}} characters long",
  "string.length": "{{#label}} must be {{#limit}} characters long",
  "string.email": "{{#label}} must be a valid email address",
  "any.required": "{{#label}} is required",
};

const contactUsSchema = {
  create: Joi.object({
    name: Joi.string().min(2).max(100).required().messages(messages),
    business_name: Joi.string().min(2).max(150).required().messages(messages),
    contact_number: Joi.string().min(5).max(20).required().messages(messages),
    contact_email: Joi.string().email().required().messages(messages),
    message: Joi.string().min(10).max(500).required().messages(messages),
    country: Joi.string().min(2).max(100).required().messages(messages),
  }),
  update: Joi.object({
    name: Joi.string().min(2).max(100).messages(messages),
    business_name: Joi.string().min(2).max(150).messages(messages),
    contact_number: Joi.string().min(5).max(20).messages(messages),
    contact_email: Joi.string().email().messages(messages),
    message: Joi.string().min(10).max(500).messages(messages),
    country: Joi.string().min(2).max(100).messages(messages),
  }),
  params: Joi.object({
    id: Joi.string().guid({ version: "uuidv4" }).required().messages({
      "string.base": "ID must be a string",
      "string.guid": "ID must be a valid UUID",
      "any.required": "ID is required",
    }),
  }),
};

export default contactUsSchema;
