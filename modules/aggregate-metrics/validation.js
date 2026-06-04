const Joi = require("joi");
const { METRIC, DATE_PRESET, TOP_SORTABLE } = require("./constant");

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// Shared date-range filter used by every dashboard endpoint.
// Either pass an explicit startDate + endDate, or a relative `preset`
// (defaults to last_7_days when nothing is supplied).
const rangeFields = {
  preset: Joi.string().valid(...Object.values(DATE_PRESET)).optional(),
  startDate: Joi.string().pattern(dateRegex).optional().messages({
    "string.pattern.base": "startDate must be in YYYY-MM-DD format.",
  }),
  endDate: Joi.string().pattern(dateRegex).optional().messages({
    "string.pattern.base": "endDate must be in YYYY-MM-DD format.",
  }),
};

const summary = Joi.object({
  ...rangeFields,
  campaignId: Joi.string().trim().optional(),
});

const performance = Joi.object({
  ...rangeFields,
  campaignId: Joi.string().trim().optional(),
  metric: Joi.string().valid(...Object.values(METRIC)).default(METRIC.INSTALL),
});

const goalReport = Joi.object({
  ...rangeFields,
  campaignId: Joi.string().trim().optional(),
});

const topCampaigns = Joi.object({
  ...rangeFields,
  sortBy: Joi.string().valid(...TOP_SORTABLE).default("spent"),
  limit: Joi.number().integer().min(1).max(50).default(10),
});

module.exports = {
  summary,
  performance,
  goalReport,
  topCampaigns,
};
