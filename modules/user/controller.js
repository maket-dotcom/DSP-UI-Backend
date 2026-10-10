const userService = require("./service");
const validate = require("./validation");
const { validateInfo } = require("../../middleware/index");
const userController = {

  // org-scoped login for admin/team members
  login: async (req, res) => {
    const data = validateInfo(validate.login, req.body);
    r = await userService.login({ data });
    return r;
  },

  // dedicated super-admin login (not org-scoped)
  superAdminLogin: async (req, res) => {
    const data = validateInfo(validate.superAdminLogin, req.body);
    r = await userService.superAdminLogin({ data });
    return r;
  },

  // super-admin only: create an org and its admin in one call
  // self-serve MCP publisher signup + login
  supplySignup: async (req, res) => {
    const data = validateInfo(validate.supplySignup, req.body);
    return userService.supplySignup({ data });
  },

  supplyLogin: async (req, res) => {
    // same shape as super-admin login: email + password, no orgId
    const data = validateInfo(validate.superAdminLogin, req.body);
    return userService.supplyLogin({ data });
  },

  createOrgWithAdmin: async (req, res) => {
    const data = validateInfo(validate.createOrgWithAdmin, req.body);
    r = await userService.createOrgWithAdmin({ data, reqBy: req.user });
    return r;
  },

  createUser: async (req, res) => {
    const data = validateInfo(validate.createUser, req.body);
    r = await userService.createUser({ data, reqBy: req.user });
    return r;
  },

  getProfile: async (req, res) => {
    r = await userService.getProfile({ reqBy: req.user });
    return r;
  },

  updateProfilePic: async (req, res) => {
    r = await userService.updateProfilePic({ files: req.files, reqBy: req.user });
    return r;
  },

  listUsers: async (req, res) => {
    const data = validateInfo(validate.listUsers, req.query);
    r = await userService.listUsers({ data, reqBy: req.user });
    return r;
  },

  getUser: async (req, res) => {
    r = await userService.getUser({ userId: req.params.id, reqBy: req.user });
    return r;
  },

  updateUser: async (req, res) => {
    const data = validateInfo(validate.updateUser, req.body);
    r = await userService.updateUser({ userId: req.params.id, data, reqBy: req.user });
    return r;
  },

  deleteUser: async (req, res) => {
    r = await userService.deleteUser({ userId: req.params.id, reqBy: req.user });
    return r;
  },




};
module.exports = userController;
