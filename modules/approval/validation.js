const Joi = require("joi");
const { STATUS, KIND, DECISION } = require("./constant");

const item = Joi.object({
  kind: Joi.string().valid(...Object.values(KIND)).required(),
  id: Joi.string().trim().pattern(/^[a-fA-F0-9]{24}$/).required().messages({
    "string.pattern.base": "Invalid id",
  }),
});

const queue = Joi.object({
  status: Joi.string().valid(...Object.values(STATUS)).default(STATUS.PENDING),
});

const review = Joi.object({
  items: Joi.array().items(item).min(1).max(500).required(),
  decision: Joi.string().valid(...Object.values(DECISION)).required(),
  note: Joi.string().trim().max(2000).allow("", null),
}).custom((v, helpers) => {
  if (v.decision === DECISION.REJECT && !(v.note || "").trim()) {
    return helpers.message("Say why it's rejected, so the network knows what to change");
  }
  return v;
});

module.exports = { queue, review, resubmit: item };
