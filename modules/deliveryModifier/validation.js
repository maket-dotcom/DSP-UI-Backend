const Joi = require("joi");
const { MAX_TERMS, MAX_CONDITIONS } = require("./constant");
const { condition } = require("../bidModifier/validation");

const objectId = Joi.string().trim().pattern(/^[a-fA-F0-9]{24}$/).messages({
  "string.pattern.base": "{{#label}} must be a valid id",
});

const term = Joi.object({
  conditions: Joi.array().items(condition).min(1).max(MAX_CONDITIONS).required().messages({
    "array.min": "Each term needs at least one condition",
  }),
  share: Joi.number().min(0).max(100).required().messages({
    "number.min": "A share is a percentage from 0 to 100",
    "number.max": "A share is a percentage from 0 to 100",
  }),
});

const fields = {
  name: Joi.string().trim().max(120),
  terms: Joi.array().items(term).max(MAX_TERMS),
  notes: Joi.string().trim().max(2000).allow("", null),
};

const create = Joi.object({
  ...fields,
  advertiserId: objectId.required(),
  name: fields.name.required(),
  terms: fields.terms.default([]),
});

const update = Joi.object(fields).min(1);

const list = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  advertiserId: objectId.optional(),
  search: Joi.string().trim().allow("").optional(),
});

const options = Joi.object({ advertiserId: objectId.required() });

module.exports = { create, update, list, options };
