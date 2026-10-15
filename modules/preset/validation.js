const Joi = require("joi");
const { KIND } = require("./constant");
const lineItemValidation = require("../lineItem/validation");
const campaignValidation = require("../campaign/validation");

const objectId = Joi.string().trim().pattern(/^[a-fA-F0-9]{24}$/).messages({
  "string.pattern.base": "{{#label}} must be a valid id",
});

// Payload per kind, built from the same rules as the real forms so a preset
// can never prefill something the form would reject.
const campaignFields = ["goal", "kpi", "currency", "budgetType", "budget", "dailyBudget", "frequencyCaps", "mmpPlatform", "eventDetails"];
const campaignSchema = campaignValidation.updateCampaign;
const PAYLOAD = {
  [KIND.CAMPAIGN]: Joi.object(Object.fromEntries(campaignFields.map((k) => [k, campaignSchema.extract(k)]))),
  [KIND.LINE_ITEM]: Joi.object({
    pacing: Joi.string().valid(...Object.values(lineItemValidation.PACING)),
    frequencyCaps: lineItemValidation.frequencyCaps,
    bidding: lineItemValidation.bidding,
    targeting: lineItemValidation.targeting,
  }),
  [KIND.TARGETING]: lineItemValidation.targeting,
};

const withPayload = (v, helpers) => {
  const r = PAYLOAD[v.kind].validate(v.payload || {});
  if (r.error) return helpers.message(`Preset settings: ${r.error.message}`);
  return { ...v, payload: r.value };
};

const create = Joi.object({
  name: Joi.string().trim().max(120).required(),
  kind: Joi.string().valid(...Object.values(KIND)).required(),
  advertiserId: objectId.allow(null).default(null),
  payload: Joi.object().unknown(true).required(),
  notes: Joi.string().trim().max(2000).allow("", null),
}).custom(withPayload);

// The kind is fixed; the payload is re-validated against it in the service.
const update = Joi.object({
  name: Joi.string().trim().max(120),
  payload: Joi.object().unknown(true),
  notes: Joi.string().trim().max(2000).allow("", null),
}).min(1);

const list = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  kind: Joi.string().valid(...Object.values(KIND)).optional(),
  advertiserId: objectId.optional(),
  search: Joi.string().trim().allow("").optional(),
});

// Presets usable for an advertiser: its own plus the org-wide ones.
const options = Joi.object({
  kind: Joi.string().valid(...Object.values(KIND)).required(),
  advertiserId: objectId.optional(),
});

module.exports = { create, update, list, options, PAYLOAD };
