const creativeService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");

const creativeController = {
  list: async (req) => {
    const data = validateInfo(validate.list, req.query);
    return creativeService.list({ data, reqBy: req.user });
  },
  create: async (req) => {
    const data = validateInfo(validate.create, req.body);
    return creativeService.create({ data, reqBy: req.user });
  },
  update: async (req) => {
    const data = validateInfo(validate.update, req.body);
    return creativeService.update({ id: req.params.id, data, reqBy: req.user });
  },
  remove: async (req) => creativeService.remove({ id: req.params.id, reqBy: req.user }),
};

module.exports = creativeController;
