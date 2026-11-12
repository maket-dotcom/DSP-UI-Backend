const segmentService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");

const segmentController = {
  list: async (req) => segmentService.list({ data: validateInfo(validate.list, req.query) }),
  facets: async (req) => segmentService.facets({ data: validateInfo(validate.facets, req.query) }),
  resolve: async (req) => segmentService.resolve({ data: validateInfo(validate.resolve, req.query) }),
  upload: async (req) => segmentService.upload({ data: validateInfo(validate.upload, req.body), reqBy: req.user }),
  uploads: async () => segmentService.uploads(),
};

module.exports = segmentController;
