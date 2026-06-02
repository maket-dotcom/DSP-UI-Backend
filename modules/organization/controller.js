const orgService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");
const { getSubdomain } = require("../../utils/common");
const { isUndefinedOrNull } = require("../../utils/validators");

const orgController = {

  update: async (req, res) => {
    const data = validateInfo(validate.update, req.body);
    r = await orgService.update({ data, reqBy: req.user });
    return r;
  },

  get: async (req, res) => {
    r = await orgService.get({ reqBy: req.user });
    return r;
  },

  getOrgConfig: async (req, res) => {
    const subdomain = getSubdomain(req?.headers?.origin);
    r = await orgService.getOrgConfig({ subdomain });
    return r;
  },

};
module.exports = orgController;
