const approvalService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");

const approvalController = {
  queue: async (req) => {
    const data = validateInfo(validate.queue, req.query);
    return approvalService.queue({ data, reqBy: req.user });
  },
  count: async (req) => approvalService.count({ reqBy: req.user }),
  review: async (req) => {
    const data = validateInfo(validate.review, req.body);
    return approvalService.review({ data, reqBy: req.user });
  },
  resubmit: async (req) => {
    const data = validateInfo(validate.resubmit, req.body);
    return approvalService.resubmit({ data, reqBy: req.user });
  },
};

module.exports = approvalController;
