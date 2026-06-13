const Joi = require("joi");

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

// Same date-range filter as the org dashboard: explicit startDate+endDate, or a
// relative `preset` (defaults to last_7_days in the service when omitted).
const rangeFields = {
  preset: Joi.string().optional(),
  startDate: Joi.string().pattern(dateRegex).optional().messages({
    "string.pattern.base": "startDate must be in YYYY-MM-DD format.",
  }),
  endDate: Joi.string().pattern(dateRegex).optional().messages({
    "string.pattern.base": "endDate must be in YYYY-MM-DD format.",
  }),
};

const dashboardSummary = Joi.object({ ...rangeFields });
const orgs = Joi.object({ ...rangeFields });

module.exports = {
  dashboardSummary,
  orgs,
};
