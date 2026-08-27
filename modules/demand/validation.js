const Joi = require("joi");
const { STATUS, KIND, INTEGRATION, PROTOCOL, AD_FORMAT, TRAFFIC_TYPE } = require("./constant");
const { endpoint, auth, deal, dealTerm } = require("../_shared/joi");

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
