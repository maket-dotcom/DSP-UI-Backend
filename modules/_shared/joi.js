const Joi = require("joi");
const { AUTH_TYPE, AD_FORMAT, DEAL_MODEL, DEAL_TYPE, AUCTION_TYPE } = require("./constant");

const endpoint = Joi.object({
  label: Joi.string().trim().allow("", null).optional(),
  url: Joi.string().uri().trim().required(),
  geos: Joi.array().items(Joi.string().trim().uppercase()).default([]),
  tmaxMs: Joi.number().integer().min(1).max(2000).default(200),
  priority: Joi.number().integer().default(0),
  qps: Joi.number().integer().min(1).allow(null).default(null),
});

const auth = Joi.object({
  type: Joi.string().valid(...Object.values(AUTH_TYPE)).default(AUTH_TYPE.NONE),
  headerName: Joi.string().trim().allow("", null).optional(),
  value: Joi.string().trim().allow("", null).optional(),
});

// Commercial arrangement: model picks which pct applies.
//   margin   → marginPct required (cut on eCPM)
//   revshare → revSharePct required (% of revenue we keep)
const deal = Joi.object({
  model: Joi.string().valid(...Object.values(DEAL_MODEL)).default(DEAL_MODEL.MARGIN),
  revSharePct: Joi.number().min(0).max(100).allow(null).default(null),
  marginPct: Joi.number().min(0).max(100).default(0),
  minMarginCpm: Joi.number().min(0).allow(null).default(null),
  bidAdjustPct: Joi.number().min(-100).max(100).default(0),
})
  .when(Joi.object({ model: Joi.valid(DEAL_MODEL.REVSHARE) }).unknown(), {
    then: Joi.object({ revSharePct: Joi.number().min(0).max(100).required() }).unknown(),
  });

// OpenRTB PMP deal terms (deals[] on both partner models).
const dealTerm = Joi.object({
  dealId: Joi.string().trim().required(),
  name: Joi.string().trim().allow("", null).optional(),
  type: Joi.string().valid(...Object.values(DEAL_TYPE)).default(DEAL_TYPE.PRIVATE_AUCTION),
  status: Joi.string().valid("active", "paused").default("active"),
  auctionType: Joi.number().valid(...Object.values(AUCTION_TYPE)).default(AUCTION_TYPE.SECOND_PRICE),
  fixedCpm: Joi.number().min(0).allow(null).default(null),
  floorCpm: Joi.number().min(0).allow(null).default(null),
  currency: Joi.string().trim().uppercase().default("USD"),
  wseat: Joi.array().items(Joi.string().trim()).default([]),
  marginPctOverride: Joi.number().min(0).max(100).allow(null).default(null),
  targeting: Joi.object({
    geos: Joi.array().items(Joi.string().trim().uppercase()).default([]),
    adFormats: Joi.array().items(Joi.string().valid(...Object.values(AD_FORMAT))).default([]),
  }).optional(),
  startDate: Joi.date().allow(null).optional(),
  endDate: Joi.date().allow(null).optional(),
  volumeGoal: Joi.number().integer().min(0).allow(null).default(null),
});

module.exports = { endpoint, auth, deal, dealTerm };
