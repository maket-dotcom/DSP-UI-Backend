const organizationModel = require("./model");
const _ = require('lodash');
const { RedisCacheKey } = require("../../connection/redis");
const { isUndefinedOrNull } = require("../../utils/validators");

require("dotenv").config();


const getOrgCacheKey = (id) => {
  return `org_by_id_${id}`;
}

const getOrgCacheKeyBySubdomain = (subdomain) => {
  return `org_by_subdomain_${subdomain}`;
}


const addOrganization = async ({ data }) => {
  const { orgType, orgName, timezone, subdomain } = data;

  const org = new organizationModel();
  org.name = orgName;
  org.type = orgType;
  org.timezone = timezone;
  org.domain = 'adsshare.in';
  org.subdomain = isUndefinedOrNull(subdomain) ? _.toLower(orgName) : _.toLower(subdomain);
  org.orgConfig = {
    logoUrl: null,
    logoUrlId: null,
    themeColor: null,
  }
  org.accessConfig = {
    crm: true,
    tracking: true
  }

  const result = await org.save();
  return result;
}

const updateAdminId = async ({ org, adminId }) => {
  await organizationModel.findOneAndUpdate({ _id: org._id }, { $set: { adminId } });
}

const getOrgByIDAndCache = async (id) => {

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

const getOrgBySubdomainAndCache = async (subdomain) => {

  const data = await RedisCacheKey.getValue(getOrgCacheKeyBySubdomain(subdomain));
  if (!isUndefinedOrNull(data)) {
    return JSON.parse(data);
  }

  const query = {
    subdomain: subdomain,
  };

  const org = await organizationModel.findOne(query);

  if (isUndefinedOrNull(org)) {
    throw new Error(`No user exists with given subdomain: ${subdomain}`);
  }

  await RedisCacheKey.setValueForTime(getOrgCacheKeyBySubdomain(subdomain), JSON.stringify(org), 60 * 60 * 6); // for 6 hrs

  return org;
}

const update = async ({ data, reqBy }) => {
  const { logoUrl, logoUrlId, themeColor } = data;
  let orgData = await organizationModel.findOne({ _id: reqBy.org_id });

  let orgConfig = orgData.orgConfig;
  if (isUndefinedOrNull(orgConfig)) orgConfig = {
    logoUrl, logoUrlId, themeColor
  };
  else {
    if (!isUndefinedOrNull(logoUrl)) orgConfig.logoUrl = logoUrl;
    if (!isUndefinedOrNull(logoUrlId)) orgConfig.logoUrlId = logoUrlId;
    if (!isUndefinedOrNull(themeColor)) orgConfig.themeColor = themeColor;
  }

  await organizationModel.findOneAndUpdate({ _id: orgData._id }, { $set: { orgConfig } });
  await RedisCacheKey.deleteKey(getOrgCacheKey(reqBy.org_id));
  await RedisCacheKey.deleteKey(getOrgCacheKeyBySubdomain(orgData.subdomain));


  orgData.orgConfig = orgConfig;

  return {
    message: `Org config updated successfully`,
    orgData
  }

}

const get = async ({ reqBy }) => {
  const orgData = await organizationModel.findOne({ _id: reqBy.org_id });

  return {
    orgData
  }
}

const getOrgConfig = async ({ subdomain }) => {
  if (isUndefinedOrNull(subdomain))
    subdomain = 'ads';
  const orgData = await getOrgBySubdomainAndCache(subdomain)
  if (isUndefinedOrNull(orgData)) {
    throw new Error('Org not registred');
  }
  return {
    orgData
  }
}


module.exports = {
  addOrganization,
  updateAdminId,
  getOrgByIDAndCache,
  getOrgBySubdomainAndCache,
  update,
  get,
  getOrgConfig
};
