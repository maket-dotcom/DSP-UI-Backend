const Joi = require("joi");
const { STATUS, APP_PLATFORM, CATEGORY } = require("./constant");
const { MMP } = require("../campaign/constant");

const defaults = Joi.object({
  geo: Joi.array().items(Joi.string().trim().uppercase()).default([]),
  currency: Joi.string().trim().uppercase().default("USD"),
  clickUrl: Joi.string().trim().allow("", null).optional(),
  mmpPlatform: Joi.string().valid(...Object.values(MMP)).allow(null).optional(),
  campaignPresetId: Joi.string().trim().pattern(/^[a-fA-F0-9]{24}$/).allow(null, "").optional(),
  lineItemPresetId: Joi.string().trim().pattern(/^[a-fA-F0-9]{24}$/).allow(null, "").optional(),
  targetingPresetId: Joi.string().trim().pattern(/^[a-fA-F0-9]{24}$/).allow(null, "").optional(),
});

const fields = {
  name: Joi.string().trim().max(120),
  domain: Joi.string().trim().uri({ scheme: ["http", "https"] }).messages({
    "string.uri": "Advertiser domain must be a full URL, e.g. https://example.com",
  }),
  appBundle: Joi.string().trim().allow("", null),
  appName: Joi.string().trim().allow("", null),
  appOs: Joi.string().valid(...Object.values(APP_PLATFORM)).allow(null),
  appIconLink: Joi.string().trim().uri().allow("", null),
  category: Joi.string().valid(...Object.keys(CATEGORY)).messages({
    "any.only": "Pick an advertiser category from the list",
  }),
  alternativeId: Joi.string().trim().allow("", null),
  notes: Joi.string().trim().max(2000).allow("", null),
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED),
  defaults: defaults,
};

const objectId = Joi.string().trim().pattern(/^[a-fA-F0-9]{24}$/).messages({
  "string.pattern.base": "Invalid network id",
});

const create = Joi.object({
  ...fields,
  // Required at org level; inside a network the advertiser joins that network.
  networkId: objectId.optional(),
  name: fields.name.required(),
  domain: fields.domain.required(),
  category: fields.category.required(),
  status: fields.status.default(STATUS.ACTIVE),
  defaults: defaults.default({}),
});

const update = Joi.object(fields).min(1);

const changeStatus = Joi.object({
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED).required(),
});

const list = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED).optional(),
  search: Joi.string().trim().allow("").optional(),
  networkId: objectId.allow("").optional(), // org level: one network's advertisers
});

const options = Joi.object({
  networkId: objectId.allow("").optional(), // org level: one network's advertisers
});

module.exports = { create, update, changeStatus, list, options };
