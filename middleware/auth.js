const jwt = require("jsonwebtoken");
const { isUndefinedOrNull } = require("../utils/validators");
const { getSubdomain } = require('../utils/common');
const { TYPE, NETWORK_TYPES } = require('../modules/user/constant');
const networkModel = require('../modules/network/model');
const userConfigService = require('../modules/userConfig/service');
const { RESOURCES, ACTIONS, STATUS: CONFIG_STATUS } = require('../modules/userConfig/constant');
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

const getNetworkCacheKey = (id) => {
  return `network_by_id_${id}`;
}

// Cached for a minute (the network service drops it on every change), so
// turning a network off blocks its users on their next request.
const getNetworkByIDAndCache = async (id) => {
  if (!/^[a-fA-F0-9]{24}$/.test(String(id || ""))) return null;
  const data = await RedisCacheKey.getValue(getNetworkCacheKey(id));
  if (!isUndefinedOrNull(data)) {
    return JSON.parse(data);
  }
  const network = await networkModel.findOne({ _id: id }).select({ orgId: 1, name: 1, status: 1 }).lean();
  if (isUndefinedOrNull(network)) return null;
  await RedisCacheKey.setValueForTime(getNetworkCacheKey(id), JSON.stringify(network), 60);
  return network;
}

// Org team members may enter a network only with the `network: view` permission.
const teamCanEnterNetworks = async (user) => {
  const { config } = await userConfigService.getByUser({ userId: user.user_id, reqBy: user });
  if (isUndefinedOrNull(config) || config.status !== CONFIG_STATUS.ACTIVE) return false;
  const allowed = config.permissions ? config.permissions[RESOURCES.NETWORK] : null;
  return Array.isArray(allowed) && allowed.includes(ACTIONS.VIEW);
}

// Org users (and super admins inside an org) work inside one of the org's
// networks by sending the `x-network-id` header, the same way a super admin
// enters an org. Every network-scoped service then filters by
// req.user.network_id; req.user.user_id stays the real person. Returns an
// error message, or null when the request may continue.
const enterNetwork = async (req) => {
  const networkId = req?.headers?.["x-network-id"];
  if (isUndefinedOrNull(networkId) || networkId === "") return null;
  if (req.user.type === TYPE.TEAM && !(await teamCanEnterNetworks(req.user))) {
    return "You don't have access to networks.";
  }
  const network = await getNetworkByIDAndCache(networkId);
  if (isUndefinedOrNull(network) || network.orgId != req.user.org_id || network.status === "deleted") {
    return "This network doesn't exist in the organization.";
  }
  req.user.network_id = String(network._id);
  req.user.acting_in_network = true;
  return null;
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
    const networkError = await enterNetwork(req);
    if (!isUndefinedOrNull(networkError)) return res.status(400).send(networkError);
    // A super admin operates across orgs, so skip the org/subdomain host check.
    return next();
  }

  // Network users are bound to the network in their token (no header can
  // change it), and that network must still be active.
  if (NETWORK_TYPES.includes(req.user.type)) {
    const network = await getNetworkByIDAndCache(req.user.network_id);
    if (isUndefinedOrNull(network) || network.orgId != req.user.org_id || network.status !== "active") {
      return res.status(403).send("Your network is turned off. Contact your organization.");
    }
  } else if (req.user.type === TYPE.ADMIN || req.user.type === TYPE.TEAM) {
    const networkError = await enterNetwork(req);
    if (!isUndefinedOrNull(networkError)) return res.status(400).send(networkError);
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
