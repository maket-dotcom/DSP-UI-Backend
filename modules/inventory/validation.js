const Joi = require("joi");
const { KIND } = require("./constant");

const country = Joi.string().trim().uppercase().length(2).messages({
  "string.length": "Country must be a 2-letter code, e.g. IN",
});

const apps = Joi.object({
  country: country.default("IN"),
  kind: Joi.string().valid(...Object.values(KIND)).default(KIND.BUNDLE),
  search: Joi.string().trim().max(200).allow("").optional(),
  exchange: Joi.string().trim().max(100).allow("").optional(),
  deviceType: Joi.string().trim().max(100).allow("").optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
});

const facets = Joi.object({
  country: country.default("IN"),
});

// A whole report file as text (the backend accepts JSON bodies up to 5 MB).
const upload = Joi.object({
  country: country.required(),
  fileName: Joi.string().trim().max(255).allow("", null),
  csv: Joi.string().min(1).max(5 * 1024 * 1024).required().messages({
    "string.max": "The file is larger than 5 MB. Split it by exchange or device type.",
  }),
});

module.exports = { apps, facets, upload };
