const aggregateMetricsService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");

const aggregateMetricsController = {
  // Top stat cards (spent / install / click / events + reEngagements + campaigns).
  getSummary: async (req, res) => {
    const data = validateInfo(validate.summary, req.query);
    r = await aggregateMetricsService.getSummary({ data, reqBy: req.user });
    return r;
  },

  // Performance line chart: date-wise series (current vs previous) for one metric.
  getPerformance: async (req, res) => {
    const data = validateInfo(validate.performance, req.query);
    r = await aggregateMetricsService.getPerformance({ data, reqBy: req.user });
    return r;
  },

  // Goal Report bar chart: total bidCount grouped by eventName.
  getGoalReport: async (req, res) => {
    const data = validateInfo(validate.goalReport, req.query);
    r = await aggregateMetricsService.getGoalReport({ data, reqBy: req.user });
    return r;
  },

  // Top Campaigns table: per-campaign click/install/events/spent.
  getTopCampaigns: async (req, res) => {
    const data = validateInfo(validate.topCampaigns, req.query);
    r = await aggregateMetricsService.getTopCampaigns({ data, reqBy: req.user });
    return r;
  },
};

module.exports = aggregateMetricsController;
