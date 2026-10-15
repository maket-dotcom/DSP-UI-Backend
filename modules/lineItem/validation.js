const Joi = require("joi");
const { STATUS, FORMAT, BIDDING_STRATEGY, PACING, AUDIENCE_TARGET, INVENTORY_TYPE } = require("./constant");

const objectId = Joi.string().trim().pattern(/^[a-fA-F0-9]{24}$/).messages({
  "string.pattern.base": "{{#label}} must be a valid id",
});
const money = Joi.number().min(0).allow(null);

const bidding = Joi.object({
  strategy: Joi.string().valid(...Object.values(BIDDING_STRATEGY)).required(),
  cpm: Joi.number().greater(0).allow(null).optional(),
  maxCpm: Joi.number().greater(0).allow(null).optional(),
}).custom((v, helpers) => {
  if (v.strategy === BIDDING_STRATEGY.FIXED_CPM && !(v.cpm > 0)) {
    return helpers.message("Enter a CPM bid greater than 0, or choose 'Use campaign bid'");
  }
  if (v.cpm > 0 && v.maxCpm > 0 && v.cpm > v.maxCpm) {
    return helpers.message("CPM bid can't be higher than the max CPM");
  }
  return v;
});

const targeting = Joi.object({
  geo: Joi.object({
    countries: Joi.object({
      // "ALL" is the UI's "Global (All)" option: the same as no country limit.
      include: Joi.array()
        .items(Joi.string().trim().uppercase())
        .default([])
        .custom((v) => (v.includes("ALL") ? [] : v)),
      exclude: Joi.array()
        .items(Joi.string().trim().uppercase())
        .default([])
        .custom((v) => v.filter((c) => c !== "ALL")),
    }).default({}),
    custom: Joi.array()
      .items(
        Joi.object({
          country: Joi.string().trim().allow("", null).optional(),
          state: Joi.string().trim().allow("", null).optional(),
          city: Joi.string().trim().allow("", null).optional(),
        })
      )
      .default([]),
  }).default({}),
  segments: Joi.object({
    audienceTarget: Joi.string().valid(...Object.values(AUDIENCE_TARGET)).default("all"),
    customAudienceIds: Joi.array().items(Joi.string().trim()).default([]),
  }).default({}),
  exchange: Joi.object({
    inventoryType: Joi.string().valid(...Object.values(INVENTORY_TYPE)).default("programmatic"),
    oemPremiumPartners: Joi.array().items(Joi.string().trim()).default([]),
  }).default({}),
});

const fields = {
  name: Joi.string().trim().max(200),
  format: Joi.string().valid(...Object.values(FORMAT)),
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED),
  alternativeId: Joi.string().trim().allow("", null),
  notes: Joi.string().trim().max(2000).allow("", null),
  startDate: Joi.date().allow(null),
  endDate: Joi.date().allow(null),
  budget: money,
  dailyBudget: money,
  pacing: Joi.string().valid(...Object.values(PACING)),
  bidding: bidding,
  targeting: targeting,
  creatives: Joi.array().items(Joi.object({ creativeId: objectId.required() })).unique("creativeId"),
};

const create = Joi.object({
  ...fields,
  campaignId: objectId.required(),
  name: fields.name.required(),
  format: fields.format.required(),
  status: fields.status.default(STATUS.PAUSED),
  pacing: fields.pacing.default(PACING.ASAP),
  bidding: bidding.required(),
  targeting: targeting.default({}),
  creatives: fields.creatives.default([]),
});

const update = Joi.object(fields).min(1);

const changeStatus = Joi.object({
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED).required(),
});

const list = Joi.object({
  campaignId: objectId.required(),
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED).optional(),
});

module.exports = { create, update, changeStatus, list };
