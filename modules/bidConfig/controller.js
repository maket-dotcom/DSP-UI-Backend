const bidConfigService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");

const bidConfigController = {
  get: async (req, res) => {
    const r = await bidConfigService.get();
    return r;
  },

  upsert: async (req, res) => {
    const data = validateInfo(validate.upsert, req.body);
    const r = await bidConfigService.upsert({ data, reqBy: req.user });
    return r;
  },

  upsertCampaign: async (req, res) => {
    const data = validateInfo(validate.upsertCampaign, req.body);
    const r = await bidConfigService.upsertCampaign({ data, reqBy: req.user });
    return r;
  },

  removeCampaign: async (req, res) => {
    const data = validateInfo(validate.removeCampaign, req.body);
    const r = await bidConfigService.removeCampaign({
      campaignId: data.campaignId,
      reqBy: req.user,
    });
    return r;
  },

  setCampaignEnableBidding: async (req, res) => {
    const data = validateInfo(validate.setCampaignEnableBidding, req.body);
    const r = await bidConfigService.setCampaignEnableBidding(data);
    return r;
  },
};

module.exports = bidConfigController;
