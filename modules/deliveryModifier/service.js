const deliveryModifierModel = require("./model");
const lineItemModel = require("../lineItem/model");
const advertiserModel = require("../advertiser/model");
const { STATUS } = require("./constant");
const { isUndefinedOrNull } = require("../../utils/validators");

const isObjectId = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const notDeleted = { $ne: STATUS.DELETED };

// The caller's modifiers: one network's when the caller works in a network
// (a network user, or an org user who entered one), else the whole org.
const scopeOf = (reqBy) =>
  isUndefinedOrNull(reqBy.network_id)
    ? { orgId: reqBy.org_id }
    : { orgId: reqBy.org_id, networkId: reqBy.network_id };

const assertAdvertiser = async (advertiserId, scope) => {
  const adv = await advertiserModel.findOne({ _id: advertiserId, ...scope, status: notDeleted }).select({ name: 1, networkId: 1 }).lean();
  if (isUndefinedOrNull(adv)) throw new Error(`No advertiser exists with id: ${advertiserId}`);
  return adv;
};

// Non-deleted line items using each modifier.
const usage = async (orgId, ids) => {
  if (!ids.length) return {};
  const rows = await lineItemModel.aggregate([
    { $match: { orgId, deliveryModifierId: { $in: ids }, status: { $ne: "deleted" } } },
    { $group: { _id: "$deliveryModifierId", lineItems: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.lineItems]));
};

const deliveryModifierService = {
  list: async ({ data, reqBy }) => {
    const { page, limit, advertiserId, search } = data;
    const query = { ...scopeOf(reqBy), status: notDeleted };
    if (advertiserId) query.advertiserId = advertiserId;
    if (!isUndefinedOrNull(search) && search !== "") query.name = new RegExp(escapeRegex(search), "i");
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      deliveryModifierModel.find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      deliveryModifierModel.countDocuments(query),
    ]);
    const advIds = [...new Set(rows.map((r) => r.advertiserId))];
    const advs = await advertiserModel.find({ _id: { $in: advIds } }).select({ name: 1 }).lean();
    const advName = Object.fromEntries(advs.map((a) => [String(a._id), a.name]));
    const used = await usage(reqBy.org_id, rows.map((r) => String(r._id)));
    return {
      data: rows.map((r) => ({ ...r, advertiserName: advName[r.advertiserId] || null, lineItems: used[String(r._id)] || 0 })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  // The advertiser's delivery modifiers, for the line item picker.
  options: async ({ data, reqBy }) => {
    const rows = await deliveryModifierModel
      .find({ ...scopeOf(reqBy), advertiserId: data.advertiserId, status: notDeleted })
      .select({ name: 1, terms: 1 })
      .sort({ name: 1 })
      .lean();
    return rows.map((r) => ({ id: r._id, value: r.name, terms: r.terms.length }));
  },

  getById: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid delivery modifier id");
    const row = await deliveryModifierModel.findOne({ _id: id, ...scopeOf(reqBy), status: notDeleted });
    if (isUndefinedOrNull(row)) throw new Error(`No delivery modifier exists with id: ${id}`);
    return { data: row };
  },

  create: async ({ data, reqBy }) => {
    const adv = await assertAdvertiser(data.advertiserId, scopeOf(reqBy));
    const saved = await new deliveryModifierModel({
      ...data,
      orgId: reqBy.org_id,
      networkId: adv.networkId || null,
      createdBy: reqBy.user_id || null,
      updatedBy: reqBy.user_id || null,
    }).save();
    return { message: "Delivery modifier created successfully", data: saved };
  },

  update: async ({ id, data, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid delivery modifier id");
    const updated = await deliveryModifierModel.findOneAndUpdate(
      { _id: id, ...scopeOf(reqBy), status: notDeleted },
      { $set: { ...data, updatedBy: reqBy.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No delivery modifier exists with id: ${id}`);
    return { message: "Delivery modifier updated successfully", data: updated };
  },

  // Soft delete, refused while a line item uses it.
  remove: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid delivery modifier id");
    const used = (await usage(reqBy.org_id, [id]))[id] || 0;
    if (used > 0) throw new Error(`${used} line item(s) still use this delivery modifier. Remove it from them first.`);
    const updated = await deliveryModifierModel.findOneAndUpdate(
      { _id: id, ...scopeOf(reqBy), status: notDeleted },
      { $set: { status: STATUS.DELETED, updatedBy: reqBy.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No delivery modifier exists with id: ${id}`);
    return { message: "Delivery modifier deleted successfully", data: { id: updated._id } };
  },

  // Used by line item create/update: the modifier must be the advertiser's.
  assertUsable: async ({ id, advertiserId, orgId }) => {
    if (!isObjectId(id)) throw new Error("Invalid delivery modifier id");
    const row = await deliveryModifierModel.findOne({ _id: id, orgId, status: notDeleted }).select({ advertiserId: 1 }).lean();
    if (isUndefinedOrNull(row)) throw new Error(`No delivery modifier exists with id: ${id}`);
    if (row.advertiserId !== String(advertiserId)) throw new Error("That delivery modifier belongs to another advertiser");
  },
};

module.exports = deliveryModifierService;
