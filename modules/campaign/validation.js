const Joi = require("joi");
const {
  STATUS,
  TYPE,
  BUDGET_TYPE,
  MMP,
  APP_PLATFORM,
} = require("./constant");

const eventItem = Joi.object({
  name: Joi.string().trim().required(),
  bidPrice: Joi.string().trim().optional(),
  currency: Joi.string().trim().optional(),
});

const addCampaign = Joi.object({
  advertiserId: Joi.string().trim().pattern(/^[a-fA-F0-9]{24}$/).required().messages({
    "any.required": "Pick an advertiser for this campaign",
    "string.pattern.base": "advertiserId must be a valid id",
  }),
  title: Joi.string().trim().required(),
  type: Joi.string().valid(...Object.values(TYPE)).required(),
  budgetType: Joi.string().valid(...Object.values(BUDGET_TYPE)).default(BUDGET_TYPE.SPEND),
  alternativeId: Joi.string().trim().allow("", null).optional(),
  notes: Joi.string().trim().max(2000).allow("", null).optional(),
  goal: Joi.string().trim().optional(),
  status: Joi.string()
    .valid(STATUS.ACTIVE, STATUS.PAUSED)
    .default(STATUS.PAUSED),

  currency: Joi.string().trim().optional(),
  bundleId: Joi.string().trim().optional(),

  // Mobile campaigns: appName + appOs are required and appIconLink (the external
  // store icon URL) is downloaded into our bucket on save.
  appName: Joi.when("type", {
    is: TYPE.MOBILE,
    then: Joi.string().trim().required(),
    otherwise: Joi.string().trim().optional(),
  }),
  appOs: Joi.when("type", {
    is: TYPE.MOBILE,
    then: Joi.string()
      .valid(...Object.values(APP_PLATFORM))
      .required(),
    otherwise: Joi.string()
      .valid(...Object.values(APP_PLATFORM))
      .optional(),
  }),
  appIconLink: Joi.string().uri().trim().optional(),

  budget: Joi.string().trim().optional(),
  dailyBudget: Joi.string().trim().optional(),
  kpi: Joi.string().trim().optional(),

  isScheduling: Joi.boolean().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),

  mmpPlatform: Joi.string()
    .valid(...Object.values(MMP))
    .optional(),
  ctaUrl: Joi.string().trim().optional(),
  // Optional in the UI — an empty string means "no VTA link" and must be accepted.
  vtaUrl: Joi.string().trim().optional().allow(""),
  eventDetails: Joi.array().items(eventItem).optional(),

  // Targeting and media moved to line items (modules/lineItem, modules/creative).
});

const updateCampaign = Joi.object({
  advertiserId: Joi.string().trim().pattern(/^[a-fA-F0-9]{24}$/).optional().messages({
    "string.pattern.base": "advertiserId must be a valid id",
  }),
  budgetType: Joi.string().valid(...Object.values(BUDGET_TYPE)).optional(),
  alternativeId: Joi.string().trim().allow("", null).optional(),
  notes: Joi.string().trim().max(2000).allow("", null).optional(),
  title: Joi.string().trim().optional(),
  type: Joi.string().valid(...Object.values(TYPE)).optional(),
  goal: Joi.string().trim().optional(),
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED).optional(),

  currency: Joi.string().trim().optional(),
  bundleId: Joi.string().trim().optional(),

  appName: Joi.string().trim().optional(),
  appOs: Joi.string()
    .valid(...Object.values(APP_PLATFORM))
    .optional(),
  appIconLink: Joi.string().uri().trim().optional(),

  budget: Joi.string().trim().optional(),
  dailyBudget: Joi.string().trim().optional(),
  kpi: Joi.string().trim().optional(),

  isScheduling: Joi.boolean().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().optional(),

  mmpPlatform: Joi.string()
    .valid(...Object.values(MMP))
    .optional(),
  ctaUrl: Joi.string().trim().optional(),
  // Optional in the UI — an empty string means "no VTA link" and must be accepted.
  vtaUrl: Joi.string().trim().optional().allow(""),
  eventDetails: Joi.array().items(eventItem).optional(),

  // Targeting and media moved to line items (modules/lineItem, modules/creative).
}).min(1);

// advertiser opt-in to the MCP bidder
const setMcpEnabled = Joi.object({
  enabled: Joi.boolean().required(),
});

const changeStatus = Joi.object({
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED).required(),
});

// Look up an app's details by its store bundle id / package name.
const appLookup = Joi.object({
  bundleId: Joi.string().trim().required(),
  platform: Joi.string()
    .valid(...Object.values(APP_PLATFORM))
    .optional(),
  // iOS storefront (ISO country code). Omit to auto-sweep busiest storefronts.
  country: Joi.string().trim().lowercase().length(2).optional(),
});

const listCampaign = Joi.object({
  advertiserId: Joi.string().trim().pattern(/^[a-fA-F0-9]{24}$/).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  type: Joi.string().valid(...Object.values(TYPE)).optional(),
  status: Joi.string()
    .valid(STATUS.ACTIVE, STATUS.PAUSED, STATUS.DELETED)
    .optional(),
  search: Joi.string().trim().optional(),
});

module.exports = {
  addCampaign,
  updateCampaign,
  changeStatus,
  setMcpEnabled,
  appLookup,
  listCampaign,
};
