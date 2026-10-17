const networkModel = require("./model");
const advertiserModel = require("../advertiser/model");
const campaignModel = require("../campaign/model");
const userDetailsModel = require("../user/model");
const { STATUS } = require("./constant");
const { isUndefinedOrNull } = require("../../utils/validators");
const { RedisCacheKey } = require("../../connection/redis");

const isObjectId = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const notDeleted = { $ne: STATUS.DELETED };

// The auth middleware caches each network for a minute; drop it on change so
// turning a network off blocks its logins on their next request.
const getNetworkCacheKey = (id) => `network_by_id_${id}`;
const dropCache = (id) => RedisCacheKey.deleteKey(getNetworkCacheKey(String(id)));

const assertNameFree = async ({ orgId, name, selfId }) => {
  const clash = await networkModel.findOne({
    orgId,
    status: notDeleted,
    name: new RegExp(`^${escapeRegex(name)}$`, "i"),
    ...(selfId ? { _id: { $ne: selfId } } : {}),
  }).lean();
  if (clash) throw new Error(`A network called "${clash.name}" already exists`);
};

// Per-network counts for the list page: advertisers, active campaigns, users.
const countsFor = async (orgId, ids) => {
  if (!ids.length) return {};
  const byNetwork = (model, extra) =>
    model.aggregate([
      { $match: { orgId, networkId: { $in: ids }, ...extra } },
      { $group: { _id: "$networkId", n: { $sum: 1 } } },
    ]);
  const [advs, live, users] = await Promise.all([
    byNetwork(advertiserModel, { status: { $ne: "deleted" } }),
    byNetwork(campaignModel, { status: "active" }),
    byNetwork(userDetailsModel, { status: { $ne: "deleted" } }),
  ]);
  const out = Object.fromEntries(ids.map((id) => [id, { advertisers: 0, activeCampaigns: 0, users: 0 }]));
  advs.forEach((r) => (out[r._id].advertisers = r.n));
  live.forEach((r) => (out[r._id].activeCampaigns = r.n));
  users.forEach((r) => (out[r._id].users = r.n));
  return out;
};

const networkService = {
  list: async ({ data, reqBy }) => {
    const { page, limit, status, search } = data;
    const query = { orgId: reqBy.org_id, status: status || notDeleted };
    if (!isUndefinedOrNull(search) && search !== "") query.name = new RegExp(escapeRegex(search), "i");
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      networkModel.find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      networkModel.countDocuments(query),
    ]);
    const counts = await countsFor(reqBy.org_id, rows.map((r) => String(r._id)));
    return {
      data: rows.map((r) => ({ ...r, ...counts[String(r._id)] })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  // Lightweight list for dropdowns (network pickers, "Enter network").
  options: async ({ reqBy }) => {
    const rows = await networkModel
      .find({ orgId: reqBy.org_id, status: notDeleted })
      .select({ name: 1, status: 1 })
      .sort({ name: 1 })
      .lean();
    return rows.map((r) => ({ id: r._id, value: r.name, status: r.status }));
  },

  getById: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid network id");
    const row = await networkModel.findOne({ _id: id, orgId: reqBy.org_id, status: notDeleted }).lean();
    if (isUndefinedOrNull(row)) throw new Error(`No network exists with id: ${id}`);
    const counts = await countsFor(reqBy.org_id, [String(row._id)]);
    return { data: { ...row, ...counts[String(row._id)] } };
  },

  // The network the caller is working in (a network user, or an org user
  // who entered one). Null when the caller works at org level.
  current: async ({ reqBy }) => {
    if (isUndefinedOrNull(reqBy.network_id)) return { data: null };
    const row = await networkModel
      .findOne({ _id: reqBy.network_id, orgId: reqBy.org_id })
      .select({ name: 1, status: 1, requireApproval: 1 })
      .lean();
    return { data: row ? { id: String(row._id), name: row.name, status: row.status, requireApproval: row.requireApproval } : null };
  },

  create: async ({ data, reqBy }) => {
    await assertNameFree({ orgId: reqBy.org_id, name: data.name });
    const saved = await new networkModel({
      ...data,
      orgId: reqBy.org_id,
      createdBy: reqBy.user_id || null,
      updatedBy: reqBy.user_id || null,
    }).save();
    return { message: "Network created successfully", data: saved };
  },

  update: async ({ id, data, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid network id");
    if (data.name) await assertNameFree({ orgId: reqBy.org_id, name: data.name, selfId: id });
    const updated = await networkModel.findOneAndUpdate(
      { _id: id, orgId: reqBy.org_id, status: notDeleted },
      { $set: { ...data, updatedBy: reqBy.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No network exists with id: ${id}`);
    await dropCache(id);
    return { message: "Network updated successfully", data: updated };
  },

  // Turning a network off blocks its logins and stops its campaigns bidding.
  changeStatus: async ({ id, status, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid network id");
    const updated = await networkModel.findOneAndUpdate(
      { _id: id, orgId: reqBy.org_id, status: notDeleted },
      { $set: { status, updatedBy: reqBy.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No network exists with id: ${id}`);
    await dropCache(id);
    const message =
      status === STATUS.ACTIVE
        ? `${updated.name} activated: its users can sign in and its campaigns can bid.`
        : `${updated.name} turned off: its users can't sign in and its campaigns stop bidding.`;
    return { message, data: { id: updated._id, status } };
  },

  // Soft delete, refused while the network still has advertisers.
  remove: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid network id");
    const open = await advertiserModel.countDocuments({ orgId: reqBy.org_id, networkId: id, status: notDeleted });
    if (open > 0) {
      throw new Error(`This network still has ${open} advertiser(s). Delete them first.`);
    }
    const updated = await networkModel.findOneAndUpdate(
      { _id: id, orgId: reqBy.org_id, status: notDeleted },
      { $set: { status: STATUS.DELETED, updatedBy: reqBy.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No network exists with id: ${id}`);
    await dropCache(id);
    return { message: "Network deleted successfully", data: { id: updated._id } };
  },

  // Used by advertiser create and user create: the network must be the org's.
  assertUsable: async ({ id, orgId }) => {
    if (!isObjectId(id)) throw new Error("Invalid network id");
    const row = await networkModel.findOne({ _id: id, orgId, status: notDeleted }).lean();
    if (isUndefinedOrNull(row)) throw new Error(`No network exists with id: ${id}`);
    return row;
  },
};

module.exports = networkService;
