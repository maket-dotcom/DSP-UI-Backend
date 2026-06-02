const userConfigService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");

const userConfigController = {
  upsert: async (req, res) => {
    const data = validateInfo(validate.upsert, req.body);
    r = await userConfigService.upsert({ data, reqBy: req.user });
    return r;
  },

  getByUser: async (req, res) => {
    const data = validateInfo(validate.byUser, req.query);
    r = await userConfigService.getByUser({ userId: data.userId, reqBy: req.user });
    return r;
  },

  me: async (req, res) => {
    r = await userConfigService.getByUser({ userId: req.user.user_id, reqBy: req.user });
    return r;
  },

  remove: async (req, res) => {
    const data = validateInfo(validate.byUser, req.body);
    r = await userConfigService.remove({ userId: data.userId, reqBy: req.user });
    return r;
  },
};
module.exports = userConfigController;
