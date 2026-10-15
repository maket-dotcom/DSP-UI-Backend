const campaignModel = require("./model");
const { isUndefinedOrNull } = require("../../utils/validators");
const { appStore } = require("../../utils/appStore");
const { uploadAppIcon } = require("../../utils/appIcon");
const { STATUS, TYPE, DATA_MAPPING } = require("./constant");
const { notifyMcpChanged } = require("../mcpPublisher/notify");
const { CAMPAIGN_REVIEW_STATUS } = require("../mcpPublisher/constant");
require("dotenv").config();

// Lazily required: advertiser / lineItem modules require the campaign model.
const advertiserService = () => require("../advertiser/service");
const advertiserModel = () => require("../advertiser/model");
const lineItemService = () => require("../lineItem/service");

// Tell the MCP bidder when an opted-in campaign changes (status, budget, …).
const notifyIfMcp = async (campaign) => {
  if (campaign?.mcpEnabled) await notifyMcpChanged("campaign", campaign._id);
};

const campaignService = {

  addCampaign: async ({ data, reqBy }) => {
    await advertiserService().assertUsable({ id: data.advertiserId, orgId: reqBy.org_id });
    const payload = { ...data, orgId: reqBy.org_id };

    // Mobile campaigns: pull the provided app icon into our bucket and persist
    // our bucket URL in appIconLink.
    if (
      payload.type === TYPE.MOBILE &&
      !isUndefinedOrNull(payload.appIconLink)
    ) {
      payload.appIconLink = await uploadAppIcon({
        url: payload.appIconLink,
        orgId: reqBy.org_id,
      });
    }
    // delete payload.appIconUrl; // never store the external URL

    const campaign = new campaignModel(payload);
    if (isUndefinedOrNull(campaign.status)) {
      campaign.status = STATUS.PAUSED;
    }
    const saved = await campaign.save();
    return { message: "Campaign created successfully", data: saved };
  },

  // list campaigns within the requester's org (paginated, excludes soft-deleted)
  listCampaigns: async ({ data, reqBy }) => {
    const { page, limit, type, status, search, advertiserId } = data;

    const query = { orgId: reqBy.org_id };
    query.status = isUndefinedOrNull(status) ? { $ne: STATUS.DELETED } : status;
    if (!isUndefinedOrNull(type)) query.type = type;
    if (!isUndefinedOrNull(advertiserId)) query.advertiserId = advertiserId;
    if (!isUndefinedOrNull(search)) {
      const rx = new RegExp(search, "i");
      query.$or = [{ title: rx }, { bundleId: rx }];
    }

    const skip = (page - 1) * limit;
    const [campaigns, total] = await Promise.all([
      campaignModel.find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      campaignModel.countDocuments(query),
    ]);

    // Advertiser name + line item counts for each row.
    const advIds = [...new Set(campaigns.map((c) => c.advertiserId).filter(Boolean))];
    const [advs, liCounts] = await Promise.all([
      advIds.length
        ? advertiserModel().find({ _id: { $in: advIds }, orgId: reqBy.org_id }).select({ name: 1 }).lean()
        : [],
      lineItemService().countsByCampaign({
        orgId: reqBy.org_id,
        campaignIds: campaigns.map((c) => String(c._id)),
      }),
    ]);
    const advName = Object.fromEntries(advs.map((a) => [String(a._id), a.name]));

    return {
      dataMapping: DATA_MAPPING,
      data: campaigns.map((c) => ({
        ...c,
        advertiserName: advName[c.advertiserId] || null,
        lineItems: liCounts[String(c._id)] || { total: 0, active: 0 },
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  // lightweight list for dropdowns: all non-deleted campaigns in the requester's
  // org as { id, value } pairs (value = campaign title)
  listCampaignOptions: async ({ reqBy }) => {
    const campaigns = await campaignModel
      .find({ orgId: reqBy.org_id, status: { $ne: STATUS.DELETED } })
      .select({ title: 1 })
      .sort({ createdAt: -1, _id: -1 });

    return campaigns.map((c) => ({ id: c._id, value: c.title }));
  },

  // resolve an app's store URL + details from its bundleId / package name.
  // platform is optional; when omitted, App Store then Play Store are tried.
  getAppDetails: async ({ data }) => {
    const app = await appStore.lookupApp({
      bundleId: data.bundleId,
      platform: data.platform,
      country: data.country,
    });
    return { data: app };
  },

  getCampaign: async ({ id, reqBy }) => {
    const campaign = await campaignModel.findOne({ _id: id, orgId: reqBy.org_id }).lean();
    if (isUndefinedOrNull(campaign)) {
      throw new Error("Invalid campaign id " + id);
    }
    // Advertiser summary for breadcrumbs / the campaign page header.
    let advertiser = null;
    if (campaign.advertiserId) {
      const a = await advertiserModel()
        .findOne({ _id: campaign.advertiserId, orgId: reqBy.org_id })
        .select({ name: 1, status: 1, category: 1 })
        .lean();
      if (a) advertiser = { id: String(a._id), name: a.name, status: a.status, category: a.category };
    }
    return { data: { ...campaign, advertiser } };
  },

  updateCampaign: async ({ id, data, reqBy }) => {
    const payload = { ...data };
    if (!isUndefinedOrNull(payload.advertiserId)) {
      await advertiserService().assertUsable({ id: payload.advertiserId, orgId: reqBy.org_id });
    }

    // If a new app icon URL is supplied, download it into our bucket and store
    // our bucket URL instead.
    if (!isUndefinedOrNull(payload.appIconLink)) {
      payload.appIconLink = await uploadAppIcon({
        url: payload.appIconLink,
        orgId: reqBy.org_id,
      });
    }
    //delete payload.appIconUrl; // never store the external URL

    // An approved MCP ad links to the campaign's CTA. If the advertiser
    // changes that link, the ad goes back to super-admin review.
    if (!isUndefinedOrNull(payload.ctaUrl)) {
      const existing = await campaignModel
        .findOne({ _id: id, orgId: reqBy.org_id, status: { $ne: STATUS.DELETED } })
        .select({ ctaUrl: 1, mcpEnabled: 1, mcp: 1 });
      if (
        existing?.mcpEnabled &&
        existing.mcp?.reviewStatus === CAMPAIGN_REVIEW_STATUS.APPROVED &&
        existing.ctaUrl !== payload.ctaUrl
      ) {
        payload["mcp.reviewStatus"] = CAMPAIGN_REVIEW_STATUS.PENDING;
        payload["mcp.reviewNotes"] = "CTA link changed — please re-check the MCP ad destination.";
      }
    }

    const updated = await campaignModel.findOneAndUpdate(
      { _id: id, orgId: reqBy.org_id, status: { $ne: STATUS.DELETED } },
      { $set: payload },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) {
      throw new Error("Invalid campaign id " + id);
    }
    await notifyIfMcp(updated);
    return { message: "Campaign updated successfully", data: updated };
  },

  // toggle a campaign between active/paused within the requester's org
  // (soft-deleted campaigns can't be reactivated)
  changeStatus: async ({ id, data, reqBy }) => {
    const updated = await campaignModel.findOneAndUpdate(
      { _id: id, orgId: reqBy.org_id, status: { $ne: STATUS.DELETED } },
      { $set: { status: data.status } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) {
      throw new Error("Invalid campaign id " + id);
    }
    await notifyIfMcp(updated);
    return { message: "Campaign status updated successfully", data: updated };
  },

  // Advertiser opt-in: run this campaign on the MCP bidder too. Super admin
  // then writes the MCP text ad (from the campaign's existing creative and
  // CTA), sets bid/targeting and approves it in MCP Review.
  setMcpEnabled: async ({ id, data, reqBy }) => {
    const set = { mcpEnabled: data.enabled };
    if (data.enabled) set.mcpRequestedAt = new Date();

    let updated = await campaignModel.findOneAndUpdate(
      { _id: id, orgId: reqBy.org_id, status: { $ne: STATUS.DELETED } },
      { $set: set },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) {
      throw new Error("Invalid campaign id " + id);
    }
    // First opt-in: queue it for review.
    if (data.enabled && isUndefinedOrNull(updated.mcp?.reviewStatus)) {
      updated = await campaignModel.findOneAndUpdate(
        { _id: id },
        { $set: { "mcp.reviewStatus": CAMPAIGN_REVIEW_STATUS.PENDING } },
        { new: true }
      );
    }
    await notifyMcpChanged("campaign", updated._id);
    return {
      message: data.enabled
        ? "MCP enabled. Our team will review and set it live."
        : "MCP disabled for this campaign.",
      data: { id: updated._id, mcpEnabled: updated.mcpEnabled, mcp: updated.mcp },
    };
  },

  // soft delete: marks the campaign as deleted within the requester's org
  deleteCampaign: async ({ id, reqBy }) => {
    const deleted = await campaignModel.findOneAndUpdate(
      { _id: id, orgId: reqBy.org_id, status: { $ne: STATUS.DELETED } },
      { $set: { status: STATUS.DELETED } }
    );
    if (isUndefinedOrNull(deleted)) {
      throw new Error("Invalid campaign id " + id);
    }
    await notifyIfMcp(deleted);
    return { message: "Campaign deleted successfully" };
  },

};

module.exports = campaignService;
