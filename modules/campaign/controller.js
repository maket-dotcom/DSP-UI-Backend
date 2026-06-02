const campaignService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");

const campaignController = {

  add: async (req, res) => {
    const data = validateInfo(validate.addCampaign, req.body);
    r = await campaignService.addCampaign({ data, reqBy: req.user });
    return r;
  },

  list: async (req, res) => {
    const data = validateInfo(validate.listCampaign, req.query);
    r = await campaignService.listCampaigns({ data, reqBy: req.user });
    return r;
  },

  get: async (req, res) => {
    r = await campaignService.getCampaign({ id: req.params.id, reqBy: req.user });
    return r;
  },

  update: async (req, res) => {
    const data = validateInfo(validate.updateCampaign, req.body);
    r = await campaignService.updateCampaign({ id: req.params.id, data, reqBy: req.user });
    return r;
  },

  remove: async (req, res) => {
    r = await campaignService.deleteCampaign({ id: req.params.id, reqBy: req.user });
    return r;
  },

};
module.exports = campaignController;
