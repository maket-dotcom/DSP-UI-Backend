const targetingListService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");

const targetingListController = {
  list: async (req) => {
    const data = validateInfo(validate.list, req.query);
    return targetingListService.list({ data, reqBy: req.user });
  },
  options: async (req) => {
    const data = validateInfo(validate.options, req.query);
    return targetingListService.options({ data, reqBy: req.user });
  },
  get: async (req) => targetingListService.getById({ id: req.params.id, reqBy: req.user }),
  create: async (req) => {
    const data = validateInfo(validate.create, req.body);
    return targetingListService.create({ data, reqBy: req.user });
  },
  update: async (req) => {
    const data = validateInfo(validate.update, req.body);
    return targetingListService.update({ id: req.params.id, data, reqBy: req.user });
  },
  remove: async (req) => targetingListService.remove({ id: req.params.id, reqBy: req.user }),
};

module.exports = targetingListController;
