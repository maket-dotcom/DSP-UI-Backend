const demandService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");

const demandController = {
  list: async (req, res) => {
    const data = validateInfo(validate.list, req.query);
    return demandService.list({ data });
  },

  getById: async (req, res) => {
    return demandService.getById({ id: req.params.id });
  },

  create: async (req, res) => {
    const data = validateInfo(validate.create, req.body);
    return demandService.create({ data, reqBy: req.user });
  },

  update: async (req, res) => {
    const data = validateInfo(validate.update, req.body);
    return demandService.update({ id: req.params.id, data, reqBy: req.user });
  },

  changeStatus: async (req, res) => {
    const data = validateInfo(validate.changeStatus, req.body);
    return demandService.changeStatus({ id: req.params.id, status: data.status, reqBy: req.user });
  },

  remove: async (req, res) => {
    return demandService.remove({ id: req.params.id, reqBy: req.user });
  },
};

module.exports = demandController;
