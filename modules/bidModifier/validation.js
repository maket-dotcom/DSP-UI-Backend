const Joi = require("joi");
const { FIELD, MAX_TERMS, MAX_CONDITIONS, MAX_VALUES, MAX_MULTIPLIER } = require("./constant");

const objectId = Joi.string().trim().pattern(/^[a-fA-F0-9]{24}$/).messages({
  "string.pattern.base": "{{#label}} must be a valid id",
});
const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// Values in the form the engine compares: countries upper-cased, postal codes
// without spaces, everything else lower-cased. Fields with a fixed set of
// values are checked.
const normaliseCondition = (c, helpers) => {
  let values = c.values.map((v) => String(v).trim()).filter(Boolean);
  values = c.field === "country" ? values.map((v) => v.toUpperCase()) : values.map((v) => v.toLowerCase());
  if (c.field === "zip") values = values.map((v) => v.replace(/\s+/g, ""));
  values = [...new Set(values)];
  if (!values.length) return helpers.message(`Add at least one value for "${FIELD[c.field].label}"`);

  const check = {
    hour: (v) => /^\d{1,2}$/.test(v) && Number(v) <= 23,
    weekday: (v) => WEEKDAYS.includes(v),
    environment: (v) => v === "app" || v === "web",
    device_type: (v) => /^[1-7]$/.test(v),
    connection_type: (v) => /^[0-7]$/.test(v),
    language: (v) => /^[a-z]{2}$/.test(v),
    ad_size: (v) => /^\d{1,4}x\d{1,4}$/.test(v),
    category: (v) => /^iab\d{1,2}(-\d{1,3})?$/.test(v),
  }[c.field];
  const wrong = check ? values.find((v) => !check(v)) : undefined;
  if (wrong !== undefined) {
    return helpers.message(`"${wrong}" isn't a valid ${FIELD[c.field].label.toLowerCase()} (${FIELD[c.field].hint})`);
  }
  return { field: c.field, values };
};

const condition = Joi.object({
  field: Joi.string().valid(...Object.keys(FIELD)).required(),
  values: Joi.array().items(Joi.string().max(255).allow("")).max(MAX_VALUES).required(),
}).custom(normaliseCondition);

const term = Joi.object({
  conditions: Joi.array().items(condition).min(1).max(MAX_CONDITIONS).required().messages({
    "array.min": "Each term needs at least one condition",
  }),
  multiplier: Joi.number().min(0).max(MAX_MULTIPLIER).required().messages({
    "number.max": `A multiplier can be at most ${MAX_MULTIPLIER}`,
  }),
});

const bounds = (v, helpers) =>
  v.minBid > 0 && v.maxBid > 0 && v.minBid > v.maxBid ? helpers.message("Min bid is higher than the max bid") : v;

const fields = {
  name: Joi.string().trim().max(120),
  minBid: Joi.number().greater(0).allow(null),
  maxBid: Joi.number().greater(0).allow(null),
  terms: Joi.array().items(term).max(MAX_TERMS),
  notes: Joi.string().trim().max(2000).allow("", null),
};

const create = Joi.object({
  ...fields,
  advertiserId: objectId.required(),
  name: fields.name.required(),
  terms: fields.terms.default([]),
}).custom(bounds);

const update = Joi.object(fields).min(1).custom(bounds);

const list = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  advertiserId: objectId.optional(),
  search: Joi.string().trim().allow("").optional(),
});

const options = Joi.object({ advertiserId: objectId.required() });

// `condition` is shared with delivery modifiers (same fields, same value rules).
module.exports = { create, update, list, options, condition };
