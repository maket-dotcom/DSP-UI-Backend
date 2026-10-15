const lineItemService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");

const lineItemController = {
  list: async (req) => {
    const data = validateInfo(validate.list, req.query);
    return lineItemService.list({ data, reqBy: req.user });
  },
  get: async (req) => lineItemService.getById({ id: req.params.id, reqBy: req.user }),
  create: async (req) => {
    const data = validateInfo(validate.create, req.body);
    return lineItemService.create({ data, reqBy: req.user });
  },
  update: async (req) => {
    const data = validateInfo(validate.update, req.body);
    return lineItemService.update({ id: req.params.id, data, reqBy: req.user });
  },
  changeStatus: async (req) => {
    const data = validateInfo(validate.changeStatus, req.body);
    return lineItemService.changeStatus({ id: req.params.id, status: data.status, reqBy: req.user });
  },
  remove: async (req) => lineItemService.remove({ id: req.params.id, reqBy: req.user }),
};

module.exports = lineItemController;
