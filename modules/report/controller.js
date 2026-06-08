const reportService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");

const reportController = {
  // Statistics report: group-by + columns + filters all come in the body.
  getReport: async (req, res) => {
    const data = validateInfo(validate.getReport, req.body);
    r = await reportService.getReport({ data, reqBy: req.user });
    return r;
  },
};

module.exports = reportController;
