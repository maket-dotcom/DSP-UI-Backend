const Joi = require("joi");
const {
  SERVER_STATUS,
  PLACEMENT_STATUS,
  PLACEMENT_FORMAT,
  TRANSPORT,
  KEY_MODE,
  REVIEW_DECISION,
  CAMPAIGN_REVIEW_STATUS,
  CATEGORIES,
  INTENTS,
  CAMPAIGN_PRICING_MODEL,
} = require("./constant");

const CATEGORY_IDS = CATEGORIES.map((c) => c.id);

const objectId = Joi.string().trim().pattern(/^[a-fA-F0-9]{24}$/).messages({
  "string.pattern.base": "Invalid id",
});
const categoryList = Joi.array().items(Joi.string().valid(...CATEGORY_IDS)).unique();
const shortList = (max, len) => Joi.array().items(Joi.string().trim().max(len)).max(max).unique();
const toolName = Joi.string().trim().max(128);

const placement = Joi.object({
  key: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[a-z0-9_]{2,40}$/)
    .required()
    .messages({ "string.pattern.base": "placement key must be 2-40 chars of a-z, 0-9, _" }),
  name: Joi.string().trim().max(80).optional().allow(null, ""),
  format: Joi.string().valid(...Object.values(PLACEMENT_FORMAT)).default(PLACEMENT_FORMAT.TEXT_CARD),
  status: Joi.string().valid(...Object.values(PLACEMENT_STATUS)).default(PLACEMENT_STATUS.ACTIVE),
  toolAllowlist: Joi.array().items(toolName).max(200).unique().default([]),
  toolCategoryMap: Joi.object().pattern(toolName, Joi.string().valid(...CATEGORY_IDS)).default({}),
  frequency: Joi.object({
    perSession: Joi.number().integer().min(0).max(20).default(1),
    perHourPerSession: Joi.number().integer().min(0).max(60).default(3),
  }).default(),
  floorCpc: Joi.number().min(0).max(50).default(0),
});

const serverFields = {
  name: Joi.string().trim().min(2).max(80),
  description: Joi.string().trim().max(1000).allow(null, ""),
  serverUrl: Joi.string().trim().uri({ scheme: ["https"] }).allow(null, ""),
  homepage: Joi.string().trim().uri({ scheme: ["https", "http"] }).allow(null, ""),
  transport: Joi.string().valid(...Object.values(TRANSPORT)),
  categories: categoryList.min(1).max(5),
  blockedCategories: categoryList,
  blockedAdvertiserDomains: shortList(200, 253),
  blockedHosts: shortList(50, 64),
  placements: Joi.array().items(placement).min(1).max(10).unique("key"),
};

const createServer = Joi.object({
  ...serverFields,
  name: serverFields.name.required(),
  categories: serverFields.categories.required(),
});

const updateServer = Joi.object(serverFields).min(1);

const listServers = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid(...Object.values(SERVER_STATUS)).optional(),
  search: Joi.string().trim().max(80).optional(),
});

// publisher kill switch: live <-> paused
const changeStatus = Joi.object({
  status: Joi.string().valid(SERVER_STATUS.LIVE, SERVER_STATUS.PAUSED).required(),
});

const createKey = Joi.object({
  mode: Joi.string().valid(...Object.values(KEY_MODE)).required(),
  label: Joi.string().trim().max(60).optional().allow(null, ""),
});

// ---- super admin review ----

const reviewListServers = listServers.keys({
  status: Joi.string().valid("all", ...Object.values(SERVER_STATUS)).optional(),
});

const reviewServerDecision = Joi.object({
  decision: Joi.string().valid(...Object.values(REVIEW_DECISION)).required(),
  notes: Joi.string().trim().max(1000).optional().allow(null, ""),
  revShare: Joi.number().min(0).max(1).optional(),
});

const reviewListCampaigns = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  reviewStatus: Joi.string()
    .valid("all", ...Object.values(CAMPAIGN_REVIEW_STATUS))
    .default("all"),
});

const reviewCampaignDecision = Joi.object({
  decision: Joi.string().valid(REVIEW_DECISION.APPROVE, REVIEW_DECISION.REJECT).required(),
  notes: Joi.string().trim().max(1000).optional().allow(null, ""),
});

// ---- super admin: MCP config for an opted-in campaign ----

// http(s) URL that may contain DSP-style {macros} (filled by the bidder at
// click time). Validated with the macros stubbed out; stored as typed.
const urlWithMacros = Joi.string()
  .trim()
  .max(4096)
  .custom((value, helpers) => {
    const probe = value.replace(/\{[A-Za-z0-9_]+\}/g, "x");
    try {
      const u = new URL(probe);
      if (u.protocol === "https:" || u.protocol === "http:") return value;
    } catch (e) {
      // fall through
    }
    return helpers.message("{{#label}} must be an http(s) URL (CTA macros are allowed)");
  });

const mcpCreative = Joi.object({
  advertiser: Joi.string().trim().max(40).required(),
  title: Joi.string().trim().max(60).required(),
  description: Joi.string().trim().max(140).required(),
  cta: Joi.string().trim().max(20).default("Learn more"),
  // Usually the campaign's ctaUrl (MMP tracking link with {macros}).
  destinationUrl: urlWithMacros.required(),
  displayDomain: Joi.string().trim().lowercase().max(253).optional().allow(null, ""),
  imageUrl: Joi.string().trim().uri({ scheme: ["https", "http"] }).max(2048).optional().allow(null, ""),
});

const mcpConfig = Joi.object({
  pricingModel: Joi.string()
    .valid(...Object.values(CAMPAIGN_PRICING_MODEL))
    .default(CAMPAIGN_PRICING_MODEL.CPC),
  bid: Joi.number().positive().max(100).required(), // USD per valid click
  categories: categoryList.min(1).max(10).required(),
  intents: Joi.array().items(Joi.string().valid(...INTENTS)).unique().default([]),
  keywords: shortList(50, 32).default([]),
  negativeKeywords: shortList(50, 32).default([]),
  hosts: shortList(50, 64).default([]), // [] = every host
  excludeMcpServerIds: Joi.array().items(objectId).unique().default([]),
  frequencyCapPerSession: Joi.number().integer().min(1).max(10).default(1),
  dailyBudget: Joi.number().min(0).optional().allow(null), // null = campaign dailyBudget
  creative: mcpCreative.required(),
});

module.exports = {
  objectId,
  createServer,
  updateServer,
  listServers,
  changeStatus,
  createKey,
  reviewListServers,
  reviewServerDecision,
  reviewListCampaigns,
  reviewCampaignDecision,
  mcpConfig,
};
