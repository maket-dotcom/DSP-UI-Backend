const inventoryService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");

const inventoryController = {
  apps: async (req) => {
    const data = validateInfo(validate.apps, req.query);
    return inventoryService.apps({ data });
  },
  facets: async (req) => {
    const data = validateInfo(validate.facets, req.query);
    return inventoryService.facets({ data });
  },
  partners: async () => inventoryService.partners(),
  upload: async (req) => {
    const data = validateInfo(validate.upload, req.body);
    return inventoryService.upload({ data, reqBy: req.user });
  },
  uploads: async () => inventoryService.uploads(),
};

module.exports = inventoryController;
