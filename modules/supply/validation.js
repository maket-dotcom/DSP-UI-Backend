const Joi = require("joi");
const { STATUS, KIND, FLOW, AD_FORMAT } = require("./constant");
const { endpoint, auth, deal, dealTerm } = require("../_shared/joi");

// zoneId is the token in ?zone= — keep it URL-safe.
const zone = Joi.object({
  zoneId: Joi.string().trim().pattern(/^[a-zA-Z0-9_-]+$/).required().messages({
    "string.pattern.base": "zoneId may only contain letters, numbers, - and _",
  }),
  name: Joi.string().trim().allow("", null).optional(),
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED).default(STATUS.ACTIVE),
  formats: Joi.array().items(Joi.string().valid(...Object.values(AD_FORMAT))).default([]),
  sizes: Joi.array().items(Joi.string().trim().pattern(/^\d+x\d+$/)).default([]),
  deviceTypes: Joi.array().items(Joi.number().integer()).default([]),
  floorCpm: Joi.number().min(0).allow(null).default(null),
});

const inbound = Joi.object({
  authToken: Joi.string().trim().allow("", null).optional(),
  qps: Joi.number().integer().min(1).allow(null).default(null),
});

const outbound = Joi.object({
  endpoints: Joi.array().items(endpoint).default([]),
  auth: auth.optional(),
});

// Partner-level deal adds a default floor on top of the shared deal shape.
const supplyDeal = deal.concat(
  Joi.object({ floorCpm: Joi.number().min(0).allow(null).default(null) })
);

const supplyChain = Joi.object({
  sellerId: Joi.string().trim().allow("", null).optional(),
  sellerDomain: Joi.string().trim().allow("", null).optional(),
  isDirect: Joi.boolean().default(true),
});

const limits = Joi.object({
  dailyReqCap: Joi.number().integer().min(0).allow(null).default(null),
});

const base = {
  name: Joi.string().trim(),
  kind: Joi.string().valid(...Object.values(KIND)),
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED),
  flow: Joi.string().valid(...Object.values(FLOW)),
  inbound: inbound,
  outbound: outbound,
  deal: supplyDeal,
  zones: Joi.array().items(zone),
  deals: Joi.array().items(dealTerm),
  supplyChain: supplyChain,
  limits: limits,
  currency: Joi.string().trim().uppercase(),
};

// An outbound (or both) partner needs at least one endpoint to push supply to.
const requireOutboundEndpoints = (value, helpers) => {
  const flow = value.flow;
  if (
    (flow === FLOW.OUTBOUND || flow === FLOW.BOTH) &&
    !(value.outbound && value.outbound.endpoints && value.outbound.endpoints.length > 0)
  ) {
    return helpers.error("any.custom", {
      message: "outbound.endpoints must have at least one endpoint when flow is outbound/both",
    });
  }
  return value;
};

const create = Joi.object({
  ...base,
  name: base.name.required(),
  kind: base.kind.default(KIND.SSP),
  status: base.status.default(STATUS.PAUSED),
  flow: base.flow.default(FLOW.INBOUND),
  zones: base.zones.min(1).required(), // supply without a zone is unreachable
  deals: base.deals.default([]),
  currency: base.currency.default("USD"),
}).custom(requireOutboundEndpoints);

// Update: everything optional; at least one field.
const update = Joi.object(base).min(1);

const changeStatus = Joi.object({
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED).required(),
});

const list = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED, STATUS.DELETED).optional(),
  kind: Joi.string().valid(...Object.values(KIND)).optional(),
  flow: Joi.string().valid(...Object.values(FLOW)).optional(),
  search: Joi.string().trim().optional(),
});

module.exports = { create, update, changeStatus, list };
