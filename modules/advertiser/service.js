const advertiserModel = require("./model");
const campaignModel = require("../campaign/model");
const { STATUS, CATEGORY } = require("./constant");
const { isUndefinedOrNull } = require("../../utils/validators");
const { uploadAppIcon } = require("../../utils/appIcon");
const presetService = require("../preset/service");
const networkModel = require("../network/model");
const { NETWORK_TYPES } = require("../user/constant");

// "" from a cleared select means "no default preset".
const cleanDefaults = (payload) => {
  if (payload.defaults) {
    for (const k of ["campaignPresetId", "lineItemPresetId", "targetingPresetId"]) {
      if (payload.defaults[k] === "") payload.defaults[k] = null;
    }
  }
  return payload;
};

const isObjectId = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const notDeleted = { $ne: STATUS.DELETED };

// The caller's advertisers: one network's when the caller works in a network
// (a network user, or an org user who entered one), else the whole org.
const scopeOf = (reqBy) =>
  isUndefinedOrNull(reqBy.network_id)
    ? { orgId: reqBy.org_id }
    : { orgId: reqBy.org_id, networkId: reqBy.network_id };
const isOrgUser = (reqBy) => !NETWORK_TYPES.includes(reqBy.type);

// Network names for rows, keyed by network id.
const networkNames = async (orgId, ids) => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const rows = await networkModel.find({ _id: { $in: unique }, orgId }).select({ name: 1 }).lean();
  return Object.fromEntries(rows.map((r) => [String(r._id), r.name]));
};

// Store the app icon in our bucket (never an external URL).
const withBucketIcon = async (payload, orgId) => {
  if (!isUndefinedOrNull(payload.appIconLink) && payload.appIconLink !== "") {
    payload.appIconLink = await uploadAppIcon({ url: payload.appIconLink, orgId });
  }
  return payload;
};

// Campaign counts per advertiser, for the list page.
const campaignCounts = async (orgId, advertiserIds) => {
  if (!advertiserIds.length) return {};
  const rows = await campaignModel.aggregate([
    { $match: { orgId, advertiserId: { $in: advertiserIds }, status: notDeleted } },
    {
      $group: {
        _id: "$advertiserId",
        total: { $sum: 1 },
        active: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
      },
    },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, { total: r.total, active: r.active }]));
};

const advertiserService = {
  list: async ({ data, reqBy }) => {
    const { page, limit, status, search } = data;
    const query = { ...scopeOf(reqBy), status: status || notDeleted };
    if (isUndefinedOrNull(reqBy.network_id) && data.networkId) query.networkId = data.networkId;
    if (!isUndefinedOrNull(search) && search !== "") {
      const rx = new RegExp(escapeRegex(search), "i");
      query.$or = [{ name: rx }, { appBundle: rx }, { domain: rx }];
    }
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      advertiserModel.find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      advertiserModel.countDocuments(query),
    ]);
    const [counts, names] = await Promise.all([
      campaignCounts(reqBy.org_id, rows.map((r) => String(r._id))),
      networkNames(reqBy.org_id, rows.map((r) => r.networkId)),
    ]);
    return {
      data: rows.map((r) => ({
        ...r,
        networkName: names[r.networkId] || null,
        categoryName: CATEGORY[r.category] || null,
        campaigns: counts[String(r._id)] || { total: 0, active: 0 },
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  // Lightweight list for dropdowns. At org level, networkId narrows it to
  // one network (campaign form: pick the network, then its advertiser).
  options: async ({ data = {}, reqBy }) => {
    const query = { ...scopeOf(reqBy), status: notDeleted };
    if (isUndefinedOrNull(reqBy.network_id) && data.networkId) query.networkId = data.networkId;
    const rows = await advertiserModel
      .find(query)
      .select({ name: 1, status: 1, networkId: 1 })
      .sort({ name: 1 });
    return rows.map((r) => ({ id: r._id, value: r.name, status: r.status, networkId: r.networkId || null }));
  },

  categories: async () =>
    Object.entries(CATEGORY).map(([code, name]) => ({ id: code, value: `${name} (${code})` })),

  getById: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid advertiser id");
    const adv = await advertiserModel.findOne({ _id: id, ...scopeOf(reqBy), status: notDeleted }).lean();
    if (isUndefinedOrNull(adv)) throw new Error(`No advertiser exists with id: ${id}`);
    const names = await networkNames(reqBy.org_id, [adv.networkId]);
    return { data: { ...adv, networkName: names[adv.networkId] || null } };
  },

  create: async ({ data, reqBy }) => {
    // Every advertiser belongs to one network: the caller's, or the one picked
    // at org level (an org with a single network needn't pick).
    let networkId = reqBy.network_id || data.networkId;
    if (isUndefinedOrNull(networkId) || networkId === "") {
      const only = await networkModel.find({ orgId: reqBy.org_id, status: { $ne: "deleted" } }).select({ _id: 1 }).limit(2).lean();
      if (only.length !== 1) throw new Error("Pick the network this advertiser belongs to");
      networkId = String(only[0]._id);
    }
    const network = await networkModel.findOne({ _id: networkId, orgId: reqBy.org_id, status: { $ne: "deleted" } }).lean();
    if (isUndefinedOrNull(network)) throw new Error(`No network exists with id: ${networkId}`);

    const payload = cleanDefaults(await withBucketIcon({ ...data }, reqBy.org_id));
    await presetService.assertDefaults({
      defaults: payload.defaults,
      advertiserId: null,
      orgId: reqBy.org_id,
      networkId,
      orgUser: isOrgUser(reqBy),
    });
    const saved = await new advertiserModel({
      ...payload,
      networkId,
      orgId: reqBy.org_id,
      createdBy: reqBy.user_id || null,
      updatedBy: reqBy.user_id || null,
    }).save();
    return { message: "Advertiser created successfully", data: saved };
  },

  update: async ({ id, data, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid advertiser id");
    const existing = await advertiserModel.findOne({ _id: id, ...scopeOf(reqBy), status: notDeleted }).select({ networkId: 1 }).lean();
    if (isUndefinedOrNull(existing)) throw new Error(`No advertiser exists with id: ${id}`);
    const payload = cleanDefaults(await withBucketIcon({ ...data }, reqBy.org_id));
    await presetService.assertDefaults({
      defaults: payload.defaults,
      advertiserId: id,
      orgId: reqBy.org_id,
      networkId: existing.networkId,
      orgUser: isOrgUser(reqBy),
    });
    const updated = await advertiserModel.findOneAndUpdate(
      { _id: id, ...scopeOf(reqBy), status: notDeleted },
      { $set: { ...payload, updatedBy: reqBy.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No advertiser exists with id: ${id}`);
    return { message: "Advertiser updated successfully", data: updated };
  },

  // Pausing an advertiser stops all of its campaigns in the bid engine.
  changeStatus: async ({ id, status, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid advertiser id");
    const updated = await advertiserModel.findOneAndUpdate(
      { _id: id, ...scopeOf(reqBy), status: notDeleted },
      { $set: { status, updatedBy: reqBy.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No advertiser exists with id: ${id}`);
    const live = await campaignModel.countDocuments({ orgId: reqBy.org_id, advertiserId: id, status: STATUS.ACTIVE });
    const n = `${live} active campaign${live === 1 ? "" : "s"}`;
    const message =
      status === STATUS.ACTIVE
        ? `${updated.name} activated${live ? `: its ${n} can bid again` : ""}.`
        : `${updated.name} paused${live ? `: its ${n} stop bidding` : ""}.`;
    return { message, data: { id: updated._id, status } };
  },

  // Soft delete. Refused while the advertiser still has campaigns, so no
  // campaign is left pointing at a deleted advertiser.
  remove: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid advertiser id");
    const open = await campaignModel.countDocuments({
      orgId: reqBy.org_id,
      advertiserId: id,
      status: notDeleted,
    });
    if (open > 0) {
      throw new Error(`This advertiser still has ${open} campaign(s). Delete or move them first.`);
    }
    const updated = await advertiserModel.findOneAndUpdate(
      { _id: id, ...scopeOf(reqBy), status: notDeleted },
      { $set: { status: STATUS.DELETED, updatedBy: reqBy.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No advertiser exists with id: ${id}`);
    return { message: "Advertiser deleted successfully", data: { id: updated._id } };
  },

  // Used by campaign / creative create: the advertiser must exist in the
  // caller's org, and in the caller's network when networkId is given.
  assertUsable: async ({ id, orgId, networkId }) => {
    if (!isObjectId(id)) throw new Error("Invalid advertiser id");
    const query = { _id: id, orgId, status: notDeleted };
    if (!isUndefinedOrNull(networkId)) query.networkId = networkId;
    const adv = await advertiserModel.findOne(query).lean();
    if (isUndefinedOrNull(adv)) throw new Error(`No advertiser exists with id: ${id}`);
    return adv;
  },
};

module.exports = advertiserService;
