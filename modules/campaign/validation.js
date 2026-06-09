const Joi = require("joi");
const {
  STATUS,
  TYPE,
  AUDIENCE_TARGET,
  INVENTORY_TYPE,
  MMP,
  APP_PLATFORM,
} = require("./constant");

const mediaItem = Joi.object({
  id: Joi.string().trim().optional(),
  link: Joi.string().trim().optional(),
  type: Joi.string().trim().optional(),
  w: Joi.number().optional(),
  h: Joi.number().optional(),
});

const eventItem = Joi.object({
  name: Joi.string().trim().required(),
  bidPrice: Joi.string().trim().optional(),
  currency: Joi.string().trim().optional(),
});

const targetItem = Joi.object({
  country: Joi.string().trim().optional(),
  state: Joi.string().trim().optional(),
  city: Joi.string().trim().optional(),
});

const addCampaign = Joi.object({
  title: Joi.string().trim().required(),
  type: Joi.string().valid(...Object.values(TYPE)).required(),
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
  vtaUrl: Joi.string().trim().optional(),
  eventDetails: Joi.array().items(eventItem).optional(),

  geo: Joi.array().items(Joi.string().trim()).optional(),
  isCustomTargating: Joi.boolean().optional(),
  customTargating: Joi.array().items(targetItem).optional(),

  audienceTarget: Joi.string()
    .valid(...Object.values(AUDIENCE_TARGET))
    .optional(),
  customAudienceIds: Joi.array().items(Joi.string().trim()).optional(),

  inventoryType: Joi.string()
    .valid(...Object.values(INVENTORY_TYPE))
    .optional(),
  oemPremiumPartners: Joi.array().items(Joi.string().trim()).optional(),

  media: Joi.array().items(mediaItem).optional(),
});

const updateCampaign = Joi.object({
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
  vtaUrl: Joi.string().trim().optional(),
  eventDetails: Joi.array().items(eventItem).optional(),

  geo: Joi.array().items(Joi.string().trim()).optional(),
  isCustomTargating: Joi.boolean().optional(),
  customTargating: Joi.array().items(targetItem).optional(),

  audienceTarget: Joi.string()
    .valid(...Object.values(AUDIENCE_TARGET))
    .optional(),
  customAudienceIds: Joi.array().items(Joi.string().trim()).optional(),

  inventoryType: Joi.string()
    .valid(...Object.values(INVENTORY_TYPE))
    .optional(),
  oemPremiumPartners: Joi.array().items(Joi.string().trim()).optional(),

  media: Joi.array().items(mediaItem).optional(),
}).min(1);

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
  appLookup,
  listCampaign,
};
