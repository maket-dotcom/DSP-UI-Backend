const mcpPublisherService = require("./service");
const mcpReviewService = require("./reviewService");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");

const id = (req, name = "id") => validateInfo(validate.objectId.required(), req.params[name]);

const mcpPublisherController = {
  listCategories: async () => mcpPublisherService.listCategories(),

  listServers: async (req) => {
    const data = validateInfo(validate.listServers, req.query);
    return mcpPublisherService.listServers({ data, reqBy: req.user });
  },
  getServer: async (req) => mcpPublisherService.getServer({ id: id(req), reqBy: req.user }),
  createServer: async (req) => {
    const data = validateInfo(validate.createServer, req.body);
    return mcpPublisherService.createServer({ data, reqBy: req.user });
  },
  updateServer: async (req) => {
    const data = validateInfo(validate.updateServer, req.body);
    return mcpPublisherService.updateServer({ id: id(req), data, reqBy: req.user });
  },
  submitServer: async (req) => mcpPublisherService.submitServer({ id: id(req), reqBy: req.user }),
  changeStatus: async (req) => {
    const data = validateInfo(validate.changeStatus, req.body);
    return mcpPublisherService.changeStatus({ id: id(req), data, reqBy: req.user });
  },
  deleteServer: async (req) => mcpPublisherService.deleteServer({ id: id(req), reqBy: req.user }),

  listKeys: async (req) => mcpPublisherService.listKeys({ id: id(req), reqBy: req.user }),
  createKey: async (req) => {
    const data = validateInfo(validate.createKey, req.body);
    return mcpPublisherService.createKey({ id: id(req), data, reqBy: req.user });
  },
  revokeKey: async (req) =>
    mcpPublisherService.revokeKey({ id: id(req), keyId: id(req, "keyId"), reqBy: req.user }),

  getIntegration: async (req) => mcpPublisherService.getIntegration({ id: id(req), reqBy: req.user }),

  // ---- super admin review ----
  reviewListServers: async (req) => {
    const data = validateInfo(validate.reviewListServers, req.query);
    return mcpReviewService.listServers({ data });
  },
  reviewDecideServer: async (req) => {
    const data = validateInfo(validate.reviewServerDecision, req.body);
    return mcpReviewService.decideServer({ id: id(req), data, reqBy: req.user });
  },
  reviewListCampaigns: async (req) => {
    const data = validateInfo(validate.reviewListCampaigns, req.query);
    return mcpReviewService.listCampaigns({ data });
  },
  reviewCategories: async () => mcpPublisherService.listCategories(),
  reviewSaveCampaignConfig: async (req) => {
    const data = validateInfo(validate.mcpConfig, req.body);
    return mcpReviewService.saveCampaignConfig({ id: id(req), data, reqBy: req.user });
  },
  reviewDecideCampaign: async (req) => {
    const data = validateInfo(validate.reviewCampaignDecision, req.body);
    return mcpReviewService.decideCampaign({ id: id(req), data, reqBy: req.user });
  },
};

module.exports = mcpPublisherController;
