const supplyService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");

const supplyController = {
  list: async (req, res) => {
    const data = validateInfo(validate.list, req.query);
    return supplyService.list({ data });
  },

  getById: async (req, res) => {
    return supplyService.getById({ id: req.params.id });
  },

  create: async (req, res) => {
    const data = validateInfo(validate.create, req.body);
    return supplyService.create({ data, reqBy: req.user });
  },

  update: async (req, res) => {
    const data = validateInfo(validate.update, req.body);
    return supplyService.update({ id: req.params.id, data, reqBy: req.user });
  },

  changeStatus: async (req, res) => {
    const data = validateInfo(validate.changeStatus, req.body);
    return supplyService.changeStatus({ id: req.params.id, status: data.status, reqBy: req.user });
  },

  remove: async (req, res) => {
    return supplyService.remove({ id: req.params.id, reqBy: req.user });
  },
};

module.exports = supplyController;
