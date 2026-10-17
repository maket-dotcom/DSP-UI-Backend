const Joi = require("joi");
const { KIND, MAX_VALUES, VISIBILITY } = require("./constant");

// Values arrive as an array (the UI splits pasted text / CSV). They are
// trimmed, lower-cased and de-duplicated, matching how the engine compares;
// postal codes also lose their spaces ("SW1A 1AA" → "sw1a1aa").
const values = Joi.array()
  .items(Joi.string().trim().max(255).allow(""))
  .max(MAX_VALUES)
  .messages({ "array.max": `A list can hold at most ${MAX_VALUES} entries` });

const normalise = (kind, vals) => [
  ...new Set(
    (vals || [])
      .map((s) => s.toLowerCase())
      .map((s) => (kind === KIND.ZIP ? s.replace(/\s+/g, "") : s))
      .filter(Boolean)
  ),
];

const create = Joi.object({
  name: Joi.string().trim().max(120).required(),
  kind: Joi.string().valid(...Object.values(KIND)).default(KIND.BUNDLE),
  values: values.default([]),
  notes: Joi.string().trim().max(2000).allow("", null),
  visibility: Joi.string().valid(...Object.values(VISIBILITY)).default(VISIBILITY.PRIVATE),
}).custom((v) => ({ ...v, values: normalise(v.kind, v.values) }));

const update = Joi.object({
  name: Joi.string().trim().max(120),
  values: values,
  notes: Joi.string().trim().max(2000).allow("", null),
  visibility: Joi.string().valid(...Object.values(VISIBILITY)),
}).min(1);

const list = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  kind: Joi.string().valid(...Object.values(KIND)).optional(),
  search: Joi.string().trim().allow("").optional(),
});

const options = Joi.object({
  kind: Joi.string().valid(...Object.values(KIND)).default(KIND.BUNDLE),
  // org level: only lists this network's line items can use
  networkId: Joi.string().trim().pattern(/^[a-fA-F0-9]{24}$/).allow("").optional(),
});

module.exports = { create, update, list, options, normalise };
