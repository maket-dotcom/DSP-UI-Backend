const Joi = require("joi");
const {
  STATUS,
  KIND,
  INTEGRATION,
  PROTOCOL,
  AUTH_TYPE,
  AD_FORMAT,
  DEAL_MODEL,
  DEAL_TYPE,
  AUCTION_TYPE,
  TRAFFIC_TYPE,
} = require("./constant");

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

// Commercial arrangement: model picks which price field applies.
//   margin   → marginPct (cut on eCPM)
//   revshare → revSharePct required (% of revenue we keep)
//   fixed    → fixedCpm required (every impression settles at this eCPM)
const deal = Joi.object({
  model: Joi.string().valid(...Object.values(DEAL_MODEL)).default(DEAL_MODEL.MARGIN),
  revSharePct: Joi.number().min(0).max(100).allow(null).default(null),
  marginPct: Joi.number().min(0).max(100).default(0),
  fixedCpm: Joi.number().min(0).allow(null).default(null),
  minMarginCpm: Joi.number().min(0).allow(null).default(null),
  bidAdjustPct: Joi.number().min(-100).max(100).default(0),
})
  .when(Joi.object({ model: Joi.valid(DEAL_MODEL.REVSHARE) }).unknown(), {
    then: Joi.object({ revSharePct: Joi.number().min(0).max(100).required() }).unknown(),
  })
  .when(Joi.object({ model: Joi.valid(DEAL_MODEL.FIXED) }).unknown(), {
    then: Joi.object({ fixedCpm: Joi.number().min(0).required() }).unknown(),
  });

// OpenRTB PMP deal terms.
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

const targeting = Joi.object({
  geos: Joi.array().items(Joi.string().trim().uppercase()).default([]),
  adFormats: Joi.array().items(Joi.string().valid(...Object.values(AD_FORMAT))).default([]),
  deviceTypes: Joi.array().items(Joi.number().integer()).default([]),
  os: Joi.array().items(Joi.string().trim()).default([]),
  trafficType: Joi.string().valid(...Object.values(TRAFFIC_TYPE)).default(TRAFFIC_TYPE.ALL),
  bundlesAllow: Joi.array().items(Joi.string().trim()).default([]),
  bundlesBlock: Joi.array().items(Joi.string().trim()).default([]),
  categoriesBlock: Joi.array().items(Joi.string().trim()).default([]),
});

const limits = Joi.object({
  qps: Joi.number().integer().min(1).allow(null).default(null),
  dailyReqCap: Joi.number().integer().min(0).allow(null).default(null),
  dailySpendCap: Joi.number().min(0).allow(null).default(null),
  timeoutMs: Joi.number().integer().min(1).max(2000).default(200),
});

const sampling = Joi.object({
  trafficPct: Joi.number().min(0).max(100).default(100),
});

const create = Joi.object({
  name: Joi.string().trim().required(),
  kind: Joi.string().valid(...Object.values(KIND)).default(KIND.DSP),
  integration: Joi.string().valid(...Object.values(INTEGRATION)).default(INTEGRATION.RTB),
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED).default(STATUS.PAUSED),
  endpoints: Joi.array().items(endpoint).min(1).required(),
  protocol: Joi.string().valid(...Object.values(PROTOCOL)).default(PROTOCOL.OPENRTB_25),
  auth: auth.optional(),
  seat: Joi.string().trim().allow("", null).optional(),
  deal: deal.optional(),
  deals: Joi.array().items(dealTerm).default([]),
  targeting: targeting.optional(),
  limits: limits.optional(),
  sampling: sampling.optional(),
  currency: Joi.string().trim().uppercase().default("USD"),
  notifyWinUrl: Joi.boolean().default(true),
});

// Update: everything optional; at least one field.
const update = Joi.object({
  name: Joi.string().trim().optional(),
  kind: Joi.string().valid(...Object.values(KIND)).optional(),
  integration: Joi.string().valid(...Object.values(INTEGRATION)).optional(),
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED).optional(),
  endpoints: Joi.array().items(endpoint).min(1).optional(),
  protocol: Joi.string().valid(...Object.values(PROTOCOL)).optional(),
  auth: auth.optional(),
  seat: Joi.string().trim().allow("", null).optional(),
  deal: deal.optional(),
  deals: Joi.array().items(dealTerm).optional(),
  targeting: targeting.optional(),
  limits: limits.optional(),
  sampling: sampling.optional(),
  currency: Joi.string().trim().uppercase().optional(),
  notifyWinUrl: Joi.boolean().optional(),
}).min(1);

const changeStatus = Joi.object({
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED).required(),
});

const list = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED, STATUS.DELETED).optional(),
  kind: Joi.string().valid(...Object.values(KIND)).optional(),
  integration: Joi.string().valid(...Object.values(INTEGRATION)).optional(),
  search: Joi.string().trim().optional(),
});

module.exports = { create, update, changeStatus, list };
