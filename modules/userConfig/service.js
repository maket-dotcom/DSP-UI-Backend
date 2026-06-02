const userConfigModel = require("./model");
const userDetailsModel = require("../user/model");
const { STATUS } = require("./constant");
const { RedisCacheKey } = require("../../connection/redis");
const { isUndefinedOrNull } = require("../../utils/validators");

require("dotenv").config();

const getUserConfigCacheKey = (userId) => {
  return `user_config_by_user_${userId}`;
};

// ensures the target user exists and belongs to the requester's org so an
// admin cannot read or write permission config for another organisation
const assertUserInOrg = async ({ userId, orgId }) => {
  const user = await userDetailsModel.findOne({ _id: userId });
  if (isUndefinedOrNull(user)) {
    throw new Error(`No user exists with given id: ${userId}`);
  }
  if (user.orgId != orgId) {
    throw new Error("User does not belong to your organisation");
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

  await assertUserInOrg({ userId, orgId });

  const update = {
    userId,
    orgId,
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

const getByUser = async ({ userId, reqBy }) => {
  const config = await getByUserAndCache({ userId, orgId: reqBy.org_id });
  return {
    config,
  };
};

const remove = async ({ userId, reqBy }) => {
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
