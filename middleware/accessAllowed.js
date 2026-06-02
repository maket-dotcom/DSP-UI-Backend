const _ = require('lodash');
const { TYPE } = require('../modules/user/constant');

const accessAllowed = (arr) => {
    return (req, res, next) => {
      const type = req.user.type;
      // super_admin is platform-wide and is allowed on every guarded route.
      // The org it operates on is resolved per-request in the auth middleware.
      if (type === TYPE.SUPER_ADMIN) {
        return next();
      }
      if (!arr.includes(type)) {
        return res.status(401).send("User don't have access.");
      }
      next();
    };
  };

module.exports = accessAllowed;
