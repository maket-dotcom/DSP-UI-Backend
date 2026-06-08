const Joi = require("joi");
const { DIMENSION, METRIC, DATE_PRESET, DEFAULT_COLUMNS } = require("./constant");

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// Statistics report query. Either pass an explicit startDate + endDate
// (Custom Range) or a relative `preset` (defaults to yesterday).
const getReport = Joi.object({
  // Group By (one or more dimensions).
  groupBy: Joi.array()
    .items(Joi.string().valid(...Object.values(DIMENSION)))
    .min(1)
    .unique()
    .default([DIMENSION.CAMPAIGN]),

  // Columns (which metrics to display). All are computed regardless; this just
  // echoes the caller's selection.
  columns: Joi.array()
    .items(Joi.string().valid(...Object.values(METRIC)))
    .min(1)
    .unique()
    .default(DEFAULT_COLUMNS),

  // Filter > Campaign (single or multiple).
  campaignId: Joi.string().trim().optional(),
  campaignIds: Joi.array().items(Joi.string().trim()).optional(),

  // Free-text search across stored dimension fields (campaignId/publisher/geo).
  search: Joi.string().trim().optional(),

  // Date range.
  preset: Joi.string().valid(...Object.values(DATE_PRESET)).optional(),
  startDate: Joi.string().pattern(dateRegex).optional().messages({
    "string.pattern.base": "startDate must be in YYYY-MM-DD format.",
  }),
  endDate: Joi.string().pattern(dateRegex).optional().messages({
    "string.pattern.base": "endDate must be in YYYY-MM-DD format.",
  }),
  // IANA timezone used for preset boundaries + date/month/hour grouping.
  timezone: Joi.string().trim().default("UTC"),

  // Sorting + pagination.
  sortBy: Joi.string().valid(...Object.values(METRIC)).default(METRIC.SPENT),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(20),
});

module.exports = {
  getReport,
};
