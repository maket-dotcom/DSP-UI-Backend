const presetService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");

const presetController = {
  list: async (req) => {
    const data = validateInfo(validate.list, req.query);
    return presetService.list({ data, reqBy: req.user });
  },
  options: async (req) => {
    const data = validateInfo(validate.options, req.query);
    return presetService.options({ data, reqBy: req.user });
  },
  get: async (req) => presetService.getById({ id: req.params.id, reqBy: req.user }),
  create: async (req) => {
    const data = validateInfo(validate.create, req.body);
    return presetService.create({ data, reqBy: req.user });
  },
  update: async (req) => {
    const data = validateInfo(validate.update, req.body);
    return presetService.update({ id: req.params.id, data, reqBy: req.user });
  },
  remove: async (req) => presetService.remove({ id: req.params.id, reqBy: req.user }),
};

module.exports = presetController;
