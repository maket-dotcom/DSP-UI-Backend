const Joi = require("joi");
const { STATUS } = require("./constant");

// A single campaign bid override entry.
const campaignBidEntry = Joi.object({
  campaignId: Joi.string().required(),
  campaignTitle: Joi.string().allow(null, "").optional(),
  bidPrice: Joi.number().positive().required(),
  currency: Joi.string().uppercase().optional(),
  enabled: Joi.boolean().optional(),
  maxBidPrice: Joi.number().positive().allow(null).optional(),
  note: Joi.string().allow(null, "").optional(),
});

// Upsert the whole configuration document.
const upsert = Joi.object({
  name: Joi.string().optional(),
  status: Joi.string()
    .valid(...Object.values(STATUS))
    .optional(),
  defaultBidPrice: Joi.number().positive().allow(null).optional(),
  defaultCurrency: Joi.string().uppercase().optional(),
  campaignBids: Joi.array().items(campaignBidEntry).optional(),
});

// Add or update a single campaign entry.
const upsertCampaign = campaignBidEntry;

// Remove a single campaign entry.
const removeCampaign = Joi.object({
  campaignId: Joi.string().required(),
});

module.exports = {
  upsert,
  upsertCampaign,
  removeCampaign,
};
