const advertiserService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");

const advertiserController = {
  list: async (req) => {
    const data = validateInfo(validate.list, req.query);
    return advertiserService.list({ data, reqBy: req.user });
  },
  options: async (req) => advertiserService.options({ reqBy: req.user }),
  categories: async () => advertiserService.categories(),
  get: async (req) => advertiserService.getById({ id: req.params.id, reqBy: req.user }),
  create: async (req) => {
    const data = validateInfo(validate.create, req.body);
    return advertiserService.create({ data, reqBy: req.user });
  },
  update: async (req) => {
    const data = validateInfo(validate.update, req.body);
    return advertiserService.update({ id: req.params.id, data, reqBy: req.user });
  },
  changeStatus: async (req) => {
    const data = validateInfo(validate.changeStatus, req.body);
    return advertiserService.changeStatus({ id: req.params.id, status: data.status, reqBy: req.user });
  },
  remove: async (req) => advertiserService.remove({ id: req.params.id, reqBy: req.user }),
};

module.exports = advertiserController;
