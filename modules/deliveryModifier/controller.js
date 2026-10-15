const deliveryModifierService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");

const deliveryModifierController = {
  list: async (req) => {
    const data = validateInfo(validate.list, req.query);
    return deliveryModifierService.list({ data, reqBy: req.user });
  },
  options: async (req) => {
    const data = validateInfo(validate.options, req.query);
    return deliveryModifierService.options({ data, reqBy: req.user });
  },
  get: async (req) => deliveryModifierService.getById({ id: req.params.id, reqBy: req.user }),
  create: async (req) => {
    const data = validateInfo(validate.create, req.body);
    return deliveryModifierService.create({ data, reqBy: req.user });
  },
  update: async (req) => {
    const data = validateInfo(validate.update, req.body);
    return deliveryModifierService.update({ id: req.params.id, data, reqBy: req.user });
  },
  remove: async (req) => deliveryModifierService.remove({ id: req.params.id, reqBy: req.user }),
};

module.exports = deliveryModifierController;
