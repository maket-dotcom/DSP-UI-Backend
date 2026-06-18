const bidConfigModel = require("./model");
const campaignModel = require("../campaign/model");
const { STATUS, GLOBAL_KEY, DEFAULT_CURRENCY, CACHE_KEY } = require("./constant");
const { RedisCacheKey } = require("../../connection/redis");
const { isUndefinedOrNull } = require("../../utils/validators");

require("dotenv").config();

// Shape returned when no config document exists yet (not persisted).
const emptyConfig = () => ({
  key: GLOBAL_KEY,
  name: "Global Bid Configuration",
  status: STATUS.ACTIVE,
  defaultBidPrice: null,
  defaultCurrency: DEFAULT_CURRENCY,
  campaignBids: [],
});

const invalidateCache = async () => {
  await RedisCacheKey.deleteKey(CACHE_KEY);
};

// Ensures a referenced campaign actually exists (catches typos / stale ids).
const assertCampaignExists = async (campaignId) => {
  const campaign = await campaignModel.findOne({ _id: campaignId });
  if (isUndefinedOrNull(campaign)) {
    throw new Error(`No campaign exists with given id: ${campaignId}`);
  }
  return campaign;
};

// Read the singleton (cached). Returns a default empty shape if not yet created.
const get = async () => {
  const cached = await RedisCacheKey.getValue(CACHE_KEY);
  if (!isUndefinedOrNull(cached)) {
    return { config: JSON.parse(cached) };
  }

  const config = await bidConfigModel.findOne({ key: GLOBAL_KEY });
  const result = isUndefinedOrNull(config) ? emptyConfig() : config;

  await RedisCacheKey.setValueForTime(CACHE_KEY, JSON.stringify(result));
  return { config: result };
};

// Upsert the whole configuration document.
const upsert = async ({ data, reqBy }) => {
  // Validate every referenced campaign before writing.
  for (const entry of data.campaignBids || []) {
    await assertCampaignExists(entry.campaignId);
  }

  const set = {
    key: GLOBAL_KEY,
    updatedBy: reqBy?.user_id || null,
  };
  if (!isUndefinedOrNull(data.name)) set.name = data.name;
  if (!isUndefinedOrNull(data.status)) set.status = data.status;
  if (data.defaultBidPrice !== undefined) set.defaultBidPrice = data.defaultBidPrice;
  if (!isUndefinedOrNull(data.defaultCurrency)) set.defaultCurrency = data.defaultCurrency;
  if (!isUndefinedOrNull(data.campaignBids)) set.campaignBids = data.campaignBids;

  const config = await bidConfigModel.findOneAndUpdate(
    { key: GLOBAL_KEY },
    { $set: set, $setOnInsert: { createdBy: reqBy?.user_id || null } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await invalidateCache();
  return { message: "Bid configuration saved successfully", config };
};

// Add or update a single campaign bid entry (matched by campaignId).
const upsertCampaign = async ({ data, reqBy }) => {
  await assertCampaignExists(data.campaignId);

  // Remove any existing entry for this campaign, then add the new one.
  await bidConfigModel.updateOne(
    { key: GLOBAL_KEY },
    { $pull: { campaignBids: { campaignId: data.campaignId } } }
  );

  const config = await bidConfigModel.findOneAndUpdate(
    { key: GLOBAL_KEY },
    {
      $push: { campaignBids: data },
      $set: { updatedBy: reqBy?.user_id || null },
      $setOnInsert: { createdBy: reqBy?.user_id || null },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  await invalidateCache();
  return { message: "Campaign bid saved successfully", config };
};

// Toggle a campaign's bidding eligibility. The flag lives on the campaign
// document itself and is managed only here (super admin / bid config).
const setCampaignEnableBidding = async ({ campaignId, enableBidding }) => {
  await assertCampaignExists(campaignId);

  const campaign = await campaignModel.findOneAndUpdate(
    { _id: campaignId },
    { $set: { enableBidding } },
    { new: true }
  );

  return {
    message: `Bidding ${enableBidding ? "enabled" : "disabled"} for campaign`,
    data: {
      campaignId: String(campaign._id),
      enableBidding: campaign.enableBidding,
    },
  };
};

// Remove a single campaign bid entry.
const removeCampaign = async ({ campaignId, reqBy }) => {
  const config = await bidConfigModel.findOneAndUpdate(
    { key: GLOBAL_KEY },
    {
      $pull: { campaignBids: { campaignId } },
      $set: { updatedBy: reqBy?.user_id || null },
    },
    { new: true }
  );

  await invalidateCache();
  return { message: "Campaign bid removed successfully", config };
};

module.exports = {
  get,
  upsert,
  upsertCampaign,
  removeCampaign,
  setCampaignEnableBidding,
};
