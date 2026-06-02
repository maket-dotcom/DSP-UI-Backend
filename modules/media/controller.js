const mediaService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");
const mediaController = {
  add: async (req, res) => {
    const data = validateInfo(validate.add, req.body);
    r = await mediaService.add({data, files: req.files, reqBy: req.user});
    return r;
  },

  remove: async (req, res) => {
    const data = validateInfo(validate.remove, req.params);
    r = await mediaService.remove({ data, reqBy: req.user });
    return r;
  },

  removeMany: async (req, res) => {
    const data = validateInfo(validate.removeMany, req.body);
    r = await mediaService.removeMany({ data, reqBy: req.user });
    return r;
  },

};
module.exports = mediaController;
