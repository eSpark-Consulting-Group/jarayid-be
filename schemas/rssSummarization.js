import Joi from "joi";

const messages = {
  "string.min": "{{#label}} must be at least {{#limit}} characters long",
  "string.max": "{{#label}} must be at most {{#limit}} characters long",
  "string.uri": "{{#label}} must be a valid URL",
  "string.required": "{{#label}} is required",
  "number.min": "{{#label}} must be at least {{#limit}}",
  "number.max": "{{#label}} must be at most {{#limit}}",
  "any.required": "{{#label}} is required",
  "any.only": "{{#label}} must be one of {{#valids}}",
};

const rssSummarizationSchema = {
  createOrUpdate: Joi.object({
    word_range_15_60: Joi.number()
      .integer()
      .min(0)
      .max(100)
      .required()
      .messages(messages),
    word_range_61_300: Joi.number()
      .integer()
      .min(0)
      .max(100)
      .required()
      .messages(messages),
    word_range_301_1000: Joi.number()
      .integer()
      .min(0)
      .max(100)
      .required()
      .messages(messages),
    word_range_over_1000: Joi.number()
      .integer()
      .min(0)
      .max(100)
      .required()
      .messages(messages),

    gpt_model: Joi.string()
      .valid(
        "gpt-4.1-nano",
        "gpt-4o",
        "gpt-4.0",
        "gpt-4-turbo",
        "gpt-4",
        "gpt-3.5-turbo",
        "gpt-3.5-turbo-instruct"
      )
      .required()
      .messages(messages),

    category: Joi.array().items(Joi.string()).required().messages(messages),

    time_limit: Joi.string()
      .valid("day", "week", "month")
      .required()
      .messages(messages),

    threshold: Joi.number().integer().min(1).required().messages(messages),
  }),

  params: Joi.object({
    id: Joi.string().uuid().required().messages(messages),
  }),
};

export default rssSummarizationSchema;
