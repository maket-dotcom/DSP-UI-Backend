const jwt = require("jsonwebtoken");
const { isUndefinedOrNull } = require("../utils/validators");
const { getSubdomain } = require('../utils/common');
const { RedisCacheKey } = require("../connection/redis");
const { ModelsInitializer } = require('../connection/db/index')

require("dotenv").config();

const config = process.env;


const getOrgInfoFromDeveloperToken = async (token) => {
  const { developerTokenModel } = ModelsInitializer.getModels();

  const tokenInfo = await developerTokenModel.findOne({ token });

  if (isUndefinedOrNull(tokenInfo)) {
    throw new Error(`Invalid token: ${token}`);
  }

  return tokenInfo;
}


const verifyDeveloperToken = async (req, res, next) => {
  const authHeader =
    req?.body.token || req?.query.token || req?.headers["authorization"];  
  if (isUndefinedOrNull(authHeader)) {
    return res.status(403).send("A token is required for authentication");
  }
  const token = authHeader.split(' ')[1];
  if (isUndefinedOrNull(token)) {
    return res.status(403).send("A valid token is required for authentication");
  }


  try {
    const info = await getOrgInfoFromDeveloperToken(token);
    req.user = {
      user_id: info.userId,
      org_id: info.orgId,
      type: "admin"
    };
  } catch (err) {
    return res.status(401).send("Invalid Token");
  }

  return next();
};

module.exports = verifyDeveloperToken;
