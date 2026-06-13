const aggregateMetricsService = require("../aggregate-metrics/service");
const superAdminService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");

const superAdminController = {
  // All-orgs aggregated stat cards + platform org/campaign counts.
  dashboardSummary: async (req, res) => {
    const data = validateInfo(validate.dashboardSummary, req.query);
    const r = await aggregateMetricsService.getSuperSummary({ data });
    return r;
  },

  // Per-organisation rollup table (name/admin/metrics/active campaigns).
  orgs: async (req, res) => {
    const data = validateInfo(validate.orgs, req.query);
    const r = await aggregateMetricsService.getOrgBreakdown({ data });
    return r;
  },

  // All campaigns across orgs (for the bid-config campaign picker).
  campaigns: async (req, res) => {
    const r = await superAdminService.getAllCampaigns();
    return r;
  },
};

module.exports = superAdminController;
