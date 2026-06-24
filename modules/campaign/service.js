const path = require("path");
const { v4: uuidv4 } = require("uuid");
const campaignModel = require("./model");
const { isUndefinedOrNull } = require("../../utils/validators");
const { appStore } = require("../../utils/appStore");
const { gcs } = require("../../utils/gcs");
const { STATUS, TYPE, DATA_MAPPING } = require("./constant");
require("dotenv").config();

// True when the URL already points at our own GCS bucket (public or signed).
// Such URLs are already stored by us, so we must NOT try to re-download them
// (re-fetching our own signed/expiring URL fails with a 400).
const isOurBucketUrl = (url) =>
  typeof url === "string" && url.includes("storage.googleapis.com");

// Download an external app-icon URL and store it in our GCS bucket,
// returning our bucket URL (never the external one). If the URL is already
// our bucket URL (e.g. on edit/update), it is returned unchanged.
const uploadAppIcon = async ({ url, orgId }) => {
  if (isOurBucketUrl(url)) {
    return url;
  }

  let ext = "";
  try {
    ext = path.extname(new URL(url).pathname);
  } catch (e) {
    ext = "";
  }
  if (isUndefinedOrNull(ext) || ext === "") ext = ".png";

  const destinationPath = `campaign/org_${orgId}/app_icons/${uuidv4()}${ext}`;
  const { url: bucketUrl } = await gcs.uploadFromUrl({
    url,
    destinationPath,
    publicUrl: true, // store a permanent public URL in the DB (never expires)
  });
  return bucketUrl;
};

const campaignService = {

  addCampaign: async ({ data, reqBy }) => {
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
    const { page, limit, type, status, search } = data;

    const query = { orgId: reqBy.org_id };
    query.status = isUndefinedOrNull(status) ? { $ne: STATUS.DELETED } : status;
    if (!isUndefinedOrNull(type)) query.type = type;
    if (!isUndefinedOrNull(search)) {
      const rx = new RegExp(search, "i");
      query.$or = [{ title: rx }, { bundleId: rx }];
    }

    const skip = (page - 1) * limit;
    const [campaigns, total] = await Promise.all([
      campaignModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      campaignModel.countDocuments(query),
    ]);

    return {
      dataMapping: DATA_MAPPING,
      data: campaigns,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  // lightweight list for dropdowns: all non-deleted campaigns in the requester's
  // org as { id, value } pairs (value = campaign title)
  listCampaignOptions: async ({ reqBy }) => {
    const campaigns = await campaignModel
      .find({ orgId: reqBy.org_id, status: { $ne: STATUS.DELETED } })
      .select({ title: 1 })
      .sort({ createdAt: -1 });

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
    const campaign = await campaignModel.findOne({ _id: id, orgId: reqBy.org_id });
    if (isUndefinedOrNull(campaign)) {
      throw new Error("Invalid campaign id " + id);
    }
    return { data: campaign };
  },

  updateCampaign: async ({ id, data, reqBy }) => {
    const payload = { ...data };

    // If a new app icon URL is supplied, download it into our bucket and store
    // our bucket URL instead.
    if (!isUndefinedOrNull(payload.appIconLink)) {
      payload.appIconLink = await uploadAppIcon({
        url: payload.appIconLink,
        orgId: reqBy.org_id,
      });
    }
    //delete payload.appIconUrl; // never store the external URL

    const updated = await campaignModel.findOneAndUpdate(
      { _id: id, orgId: reqBy.org_id, status: { $ne: STATUS.DELETED } },
      { $set: payload },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) {
      throw new Error("Invalid campaign id " + id);
    }
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
    return { message: "Campaign status updated successfully", data: updated };
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
    return { message: "Campaign deleted successfully" };
  },

};

module.exports = campaignService;
