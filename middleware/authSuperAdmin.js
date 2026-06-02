const jwt = require("jsonwebtoken");
const { isUndefinedOrNull } = require("../utils/validators");
const { RedisCacheKey } = require("../connection/redis");
const { TYPE } = require("../modules/user/constant");

require("dotenv").config();

/**
 * Auth guard for super-admin-only routes.
 *
 * A super admin is NOT bound to any organisation, so (unlike the normal `auth`
 * middleware) this guard intentionally skips the org/subdomain host check.
 * It only resolves the token and asserts the caller is a super admin.
 */
const verifySuperAdmin = async (req, res, next) => {
  const authHeader =
    req?.body?.token || req?.query?.token || req?.headers["authorization"];
  if (isUndefinedOrNull(authHeader)) {
    return res.status(403).send("A token is required for authentication");
  }

  const token = authHeader.split(" ")[1];
  if (isUndefinedOrNull(token)) {
    return res.status(403).send("A valid token is required for authentication");
  }

  // The client-supplied token is an opaque key; its Redis value is the JWT.
  const jwtToken = await RedisCacheKey.getValue(token);
  if (isUndefinedOrNull(jwtToken)) {
    return res.status(403).send("token is expired");
  }

  let decoded;
  try {
    decoded = jwt.verify(jwtToken, process.env.TOKEN_KEY);
  } catch (err) {
    return res.status(401).send("Invalid Token");
  }

  if (decoded.type !== TYPE.SUPER_ADMIN) {
    return res.status(401).send("Super admin access required");
  }

  req.user = decoded;
  return next();
};

module.exports = verifySuperAdmin;
