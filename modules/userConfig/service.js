const userConfigModel = require("./model");
const userDetailsModel = require("../user/model");
const { STATUS } = require("./constant");
const { RedisCacheKey } = require("../../connection/redis");
const { isUndefinedOrNull } = require("../../utils/validators");

require("dotenv").config();

const getUserConfigCacheKey = (userId) => {
  return `user_config_by_user_${userId}`;
};

// ensures the target user exists and belongs to the requester's org (and,
// inside a network, to that network) so an admin cannot read or write
// permission config for another organisation or network
const assertUserInOrg = async ({ userId, orgId, networkId }) => {
  const user = await userDetailsModel.findOne({ _id: userId });
  if (isUndefinedOrNull(user)) {
    throw new Error(`No user exists with given id: ${userId}`);
  }
  if (user.orgId != orgId) {
    throw new Error("User does not belong to your organisation");
  }
  if (!isUndefinedOrNull(networkId) && user.networkId != networkId) {
    throw new Error("User does not belong to your network");
  }
  return user;
};

const getByUserAndCache = async ({ userId, orgId }) => {
  const cached = await RedisCacheKey.getValue(getUserConfigCacheKey(userId));
  if (!isUndefinedOrNull(cached)) {
    return JSON.parse(cached);
  }

  const config = await userConfigModel.findOne({ userId, orgId });
  if (isUndefinedOrNull(config)) {
    return null;
  }

  await RedisCacheKey.setValueForTime(
    getUserConfigCacheKey(userId),
    JSON.stringify(config)
  );

  return config;
};

const upsert = async ({ data, reqBy }) => {
  const { userId, permissions, status } = data;
  const orgId = reqBy.org_id;

  const user = await assertUserInOrg({ userId, orgId, networkId: reqBy.network_id });

  const update = {
    userId,
    orgId,
    networkId: user.networkId || null,
    permissions,
    status: isUndefinedOrNull(status) ? STATUS.ACTIVE : status,
  };

  const config = await userConfigModel.findOneAndUpdate(
    { userId, orgId },
    { $set: update },
    { new: true, upsert: true }
  );

  await RedisCacheKey.deleteKey(getUserConfigCacheKey(userId));

  return {
    message: "User permission config saved successfully",
    config,
  };
};

// Inside a network, another user's config is readable only when that user
// is in the same network (the caller's own config is always readable).
const assertSameNetwork = async ({ userId, reqBy }) => {
  if (isUndefinedOrNull(reqBy.network_id) || String(userId) === String(reqBy.user_id)) return;
  await assertUserInOrg({ userId, orgId: reqBy.org_id, networkId: reqBy.network_id });
};

const getByUser = async ({ userId, reqBy }) => {
  await assertSameNetwork({ userId, reqBy });
  const config = await getByUserAndCache({ userId, orgId: reqBy.org_id });
  return {
    config,
  };
};

const remove = async ({ userId, reqBy }) => {
  await assertSameNetwork({ userId, reqBy });
  await userConfigModel.findOneAndDelete({ userId, orgId: reqBy.org_id });
  await RedisCacheKey.deleteKey(getUserConfigCacheKey(userId));

  return {
    message: "User permission config removed successfully",
  };
};

module.exports = {
  upsert,
  getByUser,
  remove,
};
