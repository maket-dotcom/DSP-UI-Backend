const bidModifierModel = require("./model");
const lineItemModel = require("../lineItem/model");
const advertiserModel = require("../advertiser/model");
const { STATUS, FIELD } = require("./constant");
const { isUndefinedOrNull } = require("../../utils/validators");

const isObjectId = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const notDeleted = { $ne: STATUS.DELETED };

const assertAdvertiser = async (advertiserId, orgId) => {
  const adv = await advertiserModel.findOne({ _id: advertiserId, orgId, status: notDeleted }).select({ name: 1 }).lean();
  if (isUndefinedOrNull(adv)) throw new Error(`No advertiser exists with id: ${advertiserId}`);
  return adv;
};

// Non-deleted line items using each modifier.
const usage = async (orgId, ids) => {
  if (!ids.length) return {};
  const rows = await lineItemModel.aggregate([
    { $match: { orgId, bidModifierId: { $in: ids }, status: { $ne: "deleted" } } },
    { $group: { _id: "$bidModifierId", lineItems: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.lineItems]));
};

const bidModifierService = {
  fields: async () => Object.entries(FIELD).map(([value, f]) => ({ value, name: f.label, hint: f.hint })),

  list: async ({ data, reqBy }) => {
    const { page, limit, advertiserId, search } = data;
    const query = { orgId: reqBy.org_id, status: notDeleted };
    if (advertiserId) query.advertiserId = advertiserId;
    if (!isUndefinedOrNull(search) && search !== "") query.name = new RegExp(escapeRegex(search), "i");
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      bidModifierModel.find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      bidModifierModel.countDocuments(query),
    ]);
    const advIds = [...new Set(rows.map((r) => r.advertiserId))];
    const advs = await advertiserModel.find({ _id: { $in: advIds } }).select({ name: 1 }).lean();
    const advName = Object.fromEntries(advs.map((a) => [String(a._id), a.name]));
    const used = await usage(reqBy.org_id, rows.map((r) => String(r._id)));
    return {
      data: rows.map((r) => ({
        ...r,
        advertiserName: advName[r.advertiserId] || null,
        lineItems: used[String(r._id)] || 0,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  // The advertiser's modifiers, for the line item picker.
  options: async ({ data, reqBy }) => {
    const rows = await bidModifierModel
      .find({ orgId: reqBy.org_id, advertiserId: data.advertiserId, status: notDeleted })
      .select({ name: 1, terms: 1, minBid: 1, maxBid: 1 })
      .sort({ name: 1 })
      .lean();
    return rows.map((r) => ({ id: r._id, value: r.name, terms: r.terms.length, minBid: r.minBid, maxBid: r.maxBid }));
  },

  getById: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid bid modifier id");
    const row = await bidModifierModel.findOne({ _id: id, orgId: reqBy.org_id, status: notDeleted });
    if (isUndefinedOrNull(row)) throw new Error(`No bid modifier exists with id: ${id}`);
    return { data: row };
  },

  create: async ({ data, reqBy }) => {
    await assertAdvertiser(data.advertiserId, reqBy.org_id);
    const saved = await new bidModifierModel({
      ...data,
      orgId: reqBy.org_id,
      createdBy: reqBy.user_id || null,
      updatedBy: reqBy.user_id || null,
    }).save();
    return { message: "Bid modifier created successfully", data: saved };
  },

  update: async ({ id, data, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid bid modifier id");
    const existing = await bidModifierModel.findOne({ _id: id, orgId: reqBy.org_id, status: notDeleted }).lean();
    if (isUndefinedOrNull(existing)) throw new Error(`No bid modifier exists with id: ${id}`);
    const min = data.minBid !== undefined ? data.minBid : existing.minBid;
    const max = data.maxBid !== undefined ? data.maxBid : existing.maxBid;
    if (min > 0 && max > 0 && min > max) throw new Error("Min bid is higher than the max bid");
    const updated = await bidModifierModel.findOneAndUpdate(
      { _id: id, orgId: reqBy.org_id, status: notDeleted },
      { $set: { ...data, updatedBy: reqBy.user_id || null } },
      { new: true }
    );
    return { message: "Bid modifier updated successfully", data: updated };
  },

  // Soft delete, refused while a line item uses it.
  remove: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid bid modifier id");
    const used = (await usage(reqBy.org_id, [id]))[id] || 0;
    if (used > 0) throw new Error(`${used} line item(s) still use this bid modifier. Remove it from them first.`);
    const updated = await bidModifierModel.findOneAndUpdate(
      { _id: id, orgId: reqBy.org_id, status: notDeleted },
      { $set: { status: STATUS.DELETED, updatedBy: reqBy.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No bid modifier exists with id: ${id}`);
    return { message: "Bid modifier deleted successfully", data: { id: updated._id } };
  },

  // Used by line item create/update: the modifier must be the advertiser's.
  assertUsable: async ({ id, advertiserId, orgId }) => {
    if (!isObjectId(id)) throw new Error("Invalid bid modifier id");
    const row = await bidModifierModel.findOne({ _id: id, orgId, status: notDeleted }).select({ advertiserId: 1 }).lean();
    if (isUndefinedOrNull(row)) throw new Error(`No bid modifier exists with id: ${id}`);
    if (row.advertiserId !== String(advertiserId)) {
      throw new Error("That bid modifier belongs to another advertiser");
    }
  },
};

module.exports = bidModifierService;
