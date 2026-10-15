const bidModifierService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");

const bidModifierController = {
  fields: async () => bidModifierService.fields(),
  list: async (req) => {
    const data = validateInfo(validate.list, req.query);
    return bidModifierService.list({ data, reqBy: req.user });
  },
  options: async (req) => {
    const data = validateInfo(validate.options, req.query);
    return bidModifierService.options({ data, reqBy: req.user });
  },
  get: async (req) => bidModifierService.getById({ id: req.params.id, reqBy: req.user }),
  create: async (req) => {
    const data = validateInfo(validate.create, req.body);
    return bidModifierService.create({ data, reqBy: req.user });
  },
  update: async (req) => {
    const data = validateInfo(validate.update, req.body);
    return bidModifierService.update({ id: req.params.id, data, reqBy: req.user });
  },
  remove: async (req) => bidModifierService.remove({ id: req.params.id, reqBy: req.user }),
};

module.exports = bidModifierController;
