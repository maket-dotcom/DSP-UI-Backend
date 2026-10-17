const mongoose = require("mongoose");
const creativeModel = require("./model");
const mediaModel = require("../media/model");
const { STATUS } = require("./constant");
const { isUndefinedOrNull } = require("../../utils/validators");
const approvalService = require("../approval/service");

const isObjectId = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const notDeleted = { $ne: STATUS.DELETED };

// The caller's creatives: one network's when the caller works in a network
// (a network user, or an org user who entered one), else the whole org.
const scopeOf = (reqBy) =>
  isUndefinedOrNull(reqBy.network_id)
    ? { orgId: reqBy.org_id }
    : { orgId: reqBy.org_id, networkId: reqBy.network_id };

// Lazily required to avoid a require cycle (lineItem → creative → lineItem).
const lineItemModel = () => require("../lineItem/model");

const creativeService = {
  list: async ({ data, reqBy }) => {
    const { advertiserId, type, status, search, page, limit } = data;
    const query = { ...scopeOf(reqBy), advertiserId, status: status || notDeleted };
    if (!isUndefinedOrNull(type)) query.type = type;
    if (!isUndefinedOrNull(search) && search !== "") {
      const rx = new RegExp(escapeRegex(search), "i");
      query.$or = [{ name: rx }, { link: rx }, { vastTag: rx }];
    }
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      creativeModel.find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit),
      creativeModel.countDocuments(query),
    ]);
    return { data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
  },

  create: async ({ data, reqBy }) => {
    const { advertiserService } = require("../advertiser");
    const adv = await advertiserService.assertUsable({
      id: data.advertiserId,
      orgId: reqBy.org_id,
      networkId: reqBy.network_id,
    });

    const { mediaId, ...fields } = data;
    const doc = {
      ...fields,
      orgId: reqBy.org_id,
      networkId: adv.networkId || null,
      status: STATUS.ACTIVE,
      approval: await approvalService.initial({ reqBy, networkId: adv.networkId }),
      createdBy: reqBy.user_id || null,
      updatedBy: reqBy.user_id || null,
    };

    // Reuse the upload's id as the creative id (see model). Re-creating a
    // creative for the same upload returns the existing one.
    if (!isUndefinedOrNull(mediaId)) {
      const media = await mediaModel.findOne({ _id: mediaId, ...scopeOf(reqBy) }).lean();
      if (isUndefinedOrNull(media)) throw new Error(`No uploaded media exists with id: ${mediaId}`);
      const existing = await creativeModel.findOne({ _id: mediaId, ...scopeOf(reqBy) });
      if (existing) return { message: "Creative already exists", data: existing };
      doc._id = new mongoose.Types.ObjectId(mediaId);
      if (isUndefinedOrNull(doc.link) || doc.link === "") doc.link = media.link1;
      if (isUndefinedOrNull(doc.mime) && media.fileType) doc.mime = media.fileType;
      if (isUndefinedOrNull(doc.name) || doc.name === "") doc.name = media.name || null;
    }

    const saved = await new creativeModel(doc).save();
    return { message: "Creative created successfully", data: saved };
  },

  update: async ({ id, data, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid creative id");
    const existing = await creativeModel.findOne({ _id: id, ...scopeOf(reqBy), status: notDeleted }).lean();
    if (isUndefinedOrNull(existing)) throw new Error(`No creative exists with id: ${id}`);
    // A network's change to the click-through link goes back to its org.
    const approval = await approvalService.afterEdit({ reqBy, kind: "creative", existing, patch: data, networkId: existing.networkId });
    const updated = await creativeModel.findOneAndUpdate(
      { _id: id, ...scopeOf(reqBy), status: notDeleted },
      { $set: { ...data, ...approval, updatedBy: reqBy.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No creative exists with id: ${id}`);
    return { message: "Creative updated successfully", data: updated };
  },

  // Soft delete. Refused while a live line item still uses it, because the
  // engine would silently drop the creative from that line item.
  remove: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid creative id");
    const using = await lineItemModel().countDocuments({
      ...scopeOf(reqBy),
      status: notDeleted,
      "creatives.creativeId": id,
    });
    if (using > 0) {
      throw new Error(`This creative is used by ${using} line item(s). Remove it from them first.`);
    }
    const updated = await creativeModel.findOneAndUpdate(
      { _id: id, ...scopeOf(reqBy), status: notDeleted },
      { $set: { status: STATUS.DELETED, updatedBy: reqBy.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No creative exists with id: ${id}`);
    return { message: "Creative deleted successfully", data: { id: updated._id } };
  },

  // Used by line item save: every creative must belong to the same advertiser.
  assertBelongTo: async ({ ids, advertiserId, orgId }) => {
    if (!ids.length) return [];
    const rows = await creativeModel
      .find({ _id: { $in: ids }, orgId, advertiserId, status: notDeleted })
      .lean();
    if (rows.length !== new Set(ids).size) {
      throw new Error("One or more creatives don't exist or belong to another advertiser");
    }
    return rows;
  },
};

module.exports = creativeService;
