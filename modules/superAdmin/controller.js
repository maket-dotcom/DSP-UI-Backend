const aggregateMetricsService = require("../aggregate-metrics/service");
const reportService = require("../report/service");
const reportValidate = require("../report/validation");
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

  // Live bid-engine counters (proxied from the engine's /counts), polled by the
  // super-admin dashboard for a real-time view.
  engineCounts: async (req, res) => {
    const r = await superAdminService.getEngineCounts();
    return r;
  },

  // Cross-org aggregate report (group by org / campaign / bundle / country / …
  // with all metrics). Reuses the report service's super-admin variant.
  report: async (req, res) => {
    const data = validateInfo(reportValidate.getSuperReport, req.body);
    const r = await reportService.getSuperReport({ data });
    return r;
  },
};

module.exports = superAdminController;
