const campaignModel = require("./model");
const { isUndefinedOrNull } = require("../../utils/validators");
const { STATUS } = require("./constant");
require("dotenv").config();

const campaignService = {

  addCampaign: async ({ data, reqBy }) => {
    const campaign = new campaignModel({
      ...data,
      orgId: reqBy.org_id,
    });
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
      data: campaigns,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  getCampaign: async ({ id, reqBy }) => {
    const campaign = await campaignModel.findOne({ _id: id, orgId: reqBy.org_id });
    if (isUndefinedOrNull(campaign)) {
      throw new Error("Invalid campaign id " + id);
    }
    return { data: campaign };
  },

  updateCampaign: async ({ id, data, reqBy }) => {
    const updated = await campaignModel.findOneAndUpdate(
      { _id: id, orgId: reqBy.org_id, status: { $ne: STATUS.DELETED } },
      { $set: data },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) {
      throw new Error("Invalid campaign id " + id);
    }
    return { message: "Campaign updated successfully", data: updated };
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
