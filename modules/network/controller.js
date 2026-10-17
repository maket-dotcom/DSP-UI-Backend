const networkService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");

const networkController = {
  list: async (req) => {
    const data = validateInfo(validate.list, req.query);
    return networkService.list({ data, reqBy: req.user });
  },
  options: async (req) => networkService.options({ reqBy: req.user }),
  current: async (req) => networkService.current({ reqBy: req.user }),
  get: async (req) => networkService.getById({ id: req.params.id, reqBy: req.user }),
  create: async (req) => {
    const data = validateInfo(validate.create, req.body);
    return networkService.create({ data, reqBy: req.user });
  },
  update: async (req) => {
    const data = validateInfo(validate.update, req.body);
    return networkService.update({ id: req.params.id, data, reqBy: req.user });
  },
  changeStatus: async (req) => {
    const data = validateInfo(validate.changeStatus, req.body);
    return networkService.changeStatus({ id: req.params.id, status: data.status, reqBy: req.user });
  },
  remove: async (req) => networkService.remove({ id: req.params.id, reqBy: req.user }),
};

module.exports = networkController;
