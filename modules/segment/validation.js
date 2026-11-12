const Joi = require("joi");
const { SOURCE, STATUS, ROUTE, DEFAULT_COUNTRY, KEY_PATTERN } = require("./constant");

const country = Joi.string().trim().uppercase().length(2).messages({
  "string.length": "Country must be a 2-letter code, e.g. IN",
});

const segmentKey = Joi.string().trim().lowercase().pattern(KEY_PATTERN).messages({
  "string.pattern.base": '{{#label}} must be a segment key such as "in.26" or "iab4.243"',
});

const list = Joi.object({
  source: Joi.string().valid(...Object.values(SOURCE)).default(SOURCE.CATALOG),
  country: country.default(DEFAULT_COUNTRY),
  search: Joi.string().trim().max(200).allow("").optional(),
  category: Joi.string().trim().max(200).allow("").optional(),
  status: Joi.string().valid(...Object.values(STATUS)).allow("").optional(),
  route: Joi.string().valid(...Object.values(ROUTE)).allow("").optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
});

const facets = Joi.object({
  country: country.default(DEFAULT_COUNTRY),
});

// ?keys=in.26,iab4.243
const resolve = Joi.object({
  keys: Joi.string().trim().max(4000).required(),
}).custom((v, helpers) => {
  const keys = [...new Set(v.keys.split(",").map((k) => k.trim().toLowerCase()).filter(Boolean))];
  if (keys.length > 200) return helpers.message("Ask for 200 segments or fewer at a time");
  const bad = keys.find((k) => !KEY_PATTERN.test(k));
  if (bad) return helpers.message(`"${bad}" isn't a segment key`);
  return { keys };
});

// The workbook as base64 (the backend takes JSON bodies up to 5 MB).
const upload = Joi.object({
  country: country.required(),
  fileName: Joi.string().trim().max(255).required(),
  file: Joi.string().min(1).max(5 * 1024 * 1024).required().messages({
    "string.max": "The file is larger than about 3.5 MB.",
  }),
});

module.exports = { list, facets, resolve, upload, segmentKey };
