const jwt = require("jsonwebtoken");
const { isUndefinedOrNull } = require("../utils/validators");
const { getSubdomain } = require('../utils/common');
const { TYPE } = require('../modules/user/constant');
//const userService = require('../modules/user/service');
//const orgService = require('../modules/organization/service')
const { RedisCacheKey } = require("../connection/redis");
//const { userDetailsModel, organizationModel } = require('../models')
const { ModelsInitializer } = require('../connection/db/index')

require("dotenv").config();

const config = process.env;

const getUserCacheKey = (id) => {
  return `user_by_id_${id}`;
}
const getOrgCacheKey = (id) => {
  return `org_by_id_${id}`;
}

const getOrgByIDAndCache = async (id) => {
  const { organizationModel } = ModelsInitializer.getModels();
  const data = await RedisCacheKey.getValue(getOrgCacheKey(id));
  if (!isUndefinedOrNull(data)) {
    return JSON.parse(data);
  }

  const query = {
    _id: id,
  };

  const org = await organizationModel.findOne(query);

  if (isUndefinedOrNull(org)) {
    throw new Error(`No user exists with given id: ${id}`);
  }

  await RedisCacheKey.setValueForTime(getOrgCacheKey(id), JSON.stringify(org));

  return org;
}

const getUserByIDAndCache = async (id) => {
  const { userDetailsModel } = ModelsInitializer.getModels();

  const data = await RedisCacheKey.getValue(getUserCacheKey(id));
  if (!isUndefinedOrNull(data)) {
    return JSON.parse(data);
  }

  const query = {
    _id: id,
  };

  const brand = await userDetailsModel.findOne(query);

  if (isUndefinedOrNull(brand)) {
    throw new Error(`No user exists with given id: ${id}`);
  }

  await RedisCacheKey.setValueForTime(getUserCacheKey(id), JSON.stringify(brand));

  return brand;
}



const verifyToken = async (req, res, next) => {
  const authHeader =
    req?.body.token || req?.query.token || req?.headers["authorization"];
  if (isUndefinedOrNull(authHeader)) {
    return res.status(403).send("A token is required for authentication");
  }
  const token = authHeader.split(' ')[1];
  if (isUndefinedOrNull(token)) {
    return res.status(403).send("A valid token is required for authentication");
  }

  const key = await RedisCacheKey.getValue(token);
  if (isUndefinedOrNull(key)) {
    return res.status(403).send("token is expired");
  }


  try {
    const decoded = jwt.verify(key, process.env.TOKEN_KEY);
    req.user = decoded;
  } catch (err) {
    return res.status(401).send("Invalid Token");
  }

  // Super admins are not bound to any org, so they must declare which org they
  // are operating on for each org-scoped request. We accept it from (in order)
  // the `x-org-id` header, the `orgId` query param, or `orgId` in the body, and
  // inject it as req.user.org_id so every org-scoped service works unchanged.
  // NOTE: this request-supplied orgId is honoured ONLY for super admins; for
  // admin/team the org_id always comes from their token (no cross-org spoofing).
  if (req.user.type === TYPE.SUPER_ADMIN) {
    const orgId =
      req?.headers?.["x-org-id"] || req?.query?.orgId || req?.body?.orgId;
    if (isUndefinedOrNull(orgId)) {
      return res
        .status(400)
        .send(
          "orgId is required for super admin requests (send it via the 'x-org-id' header, '?orgId=' query param, or 'orgId' in the body)."
        );
    }
    req.user.org_id = orgId;
    // A super admin operates across orgs, so skip the org/subdomain host check.
    return next();
  }

  //checking host
  const origin = req?.headers?.origin;
  console.log("$$$$$$$$$$$$$$$$$");
  console.log(origin);
  console.log("$$$$$$$$$$$$$$$$$");
  if (!isUndefinedOrNull(origin)) {
    const subdomain = getSubdomain(origin);
    if (!isUndefinedOrNull(subdomain)) {
      const orgId = req.user.org_id;
      const userId = req.user.user_id;
      if (isUndefinedOrNull(orgId) || isUndefinedOrNull(userId)) {
        return res.status(403).send("A valid token is required for authentication");
      }
      const user = await getUserByIDAndCache(userId);
      const org = await getOrgByIDAndCache(orgId);
      // if (subdomain != org.subdomain) {
      //   return res.status(403).send("Host client domain is not allowd to make requst");
      // }
    }

  }
  console.log(`***************${origin}***************`);

  return next();
};

module.exports = verifyToken;
