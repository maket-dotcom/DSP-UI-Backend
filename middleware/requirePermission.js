const userConfigService = require("../modules/userConfig/service");
const { STATUS } = require("../modules/userConfig/constant");
const { TYPE } = require("../modules/user/constant");
const { isUndefinedOrNull } = require("../utils/validators");

// requirePermission gates a route on the caller's stored permission config.
// super_admin and admin bypass the check; every other user must have an active
// config granting `action` on `resource` (see RESOURCES / ACTIONS constants).
// Must run after the `auth` middleware so req.user is populated.
const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const { type, user_id } = req.user;

      if (type === TYPE.SUPER_ADMIN || type === TYPE.ADMIN) {
        return next();
      }

      const { config } = await userConfigService.getByUser({
        userId: user_id,
        reqBy: req.user,
      });

      if (isUndefinedOrNull(config) || config.status !== STATUS.ACTIVE) {
        return res.status(401).send("User don't have access.");
      }

      const allowed = config.permissions ? config.permissions[resource] : null;
      if (!Array.isArray(allowed) || !allowed.includes(action)) {
        return res.status(401).send("User don't have access.");
      }

      next();
    } catch (e) {
      return res.status(401).send("User don't have access.");
    }
  };
};

module.exports = requirePermission;
