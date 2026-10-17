const presetModel = require("./model");
const advertiserModel = require("../advertiser/model");
const networkModel = require("../network/model");
const { STATUS, ADVERTISER_DEFAULT, VISIBILITY } = require("./constant");
const { PAYLOAD } = require("./validation");
const { isUndefinedOrNull } = require("../../utils/validators");

const isObjectId = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const notDeleted = { $ne: STATUS.DELETED };
const LABEL = { campaign: "campaign", lineItem: "line item", targeting: "targeting" };

// Presets the caller can see: inside a network (a network user, or an org
// user who entered one) its own presets plus the org's public ones; at org
// level every preset in the org.
const visibleTo = (reqBy) =>
  isUndefinedOrNull(reqBy.network_id)
    ? { orgId: reqBy.org_id }
    : {
        orgId: reqBy.org_id,
        $or: [{ networkId: reqBy.network_id }, { networkId: null, visibility: VISIBILITY.PUBLIC }],
      };

// Presets the caller can change: its network's own, or any at org level.
const ownedBy = (reqBy) =>
  isUndefinedOrNull(reqBy.network_id)
    ? { orgId: reqBy.org_id }
    : { orgId: reqBy.org_id, networkId: reqBy.network_id };

// The caller's advertisers, the same way.
const advertiserScope = (reqBy) =>
  isUndefinedOrNull(reqBy.network_id)
    ? { orgId: reqBy.org_id }
    : { orgId: reqBy.org_id, networkId: reqBy.network_id };

// Presets an advertiser in `networkId` can use: its network's, and the org's
// public ones (org users may also use the org's private ones).
const usableBy = (networkId, orgUser) => {
  const usable = [{ networkId: null, ...(orgUser ? {} : { visibility: VISIBILITY.PUBLIC }) }];
  if (!isUndefinedOrNull(networkId)) usable.push({ networkId });
  return usable;
};

// Only organization presets can be public; a network's presets are private to it.
const assertVisibility = (networkId, visibility) => {
  if (!isUndefinedOrNull(networkId) && visibility === VISIBILITY.PUBLIC) {
    throw new Error("Only organization presets can be shared with networks. A network's presets are private to it.");
  }
};

const isShared = (reqBy, row) => !isUndefinedOrNull(reqBy.network_id) && isUndefinedOrNull(row.networkId);

const assertAdvertiser = async (advertiserId, reqBy) => {
  if (!advertiserId) return null;
  const adv = await advertiserModel
    .findOne({ _id: advertiserId, ...advertiserScope(reqBy), status: notDeleted })
    .select({ networkId: 1 })
    .lean();
  if (isUndefinedOrNull(adv)) throw new Error(`No advertiser exists with id: ${advertiserId}`);
  return adv;
};

const presetService = {
  list: async ({ data, reqBy }) => {
    const { page, limit, kind, advertiserId, search } = data;
    const query = { ...visibleTo(reqBy), status: notDeleted };
    if (kind) query.kind = kind;
    if (advertiserId) query.advertiserId = { $in: [advertiserId, null] };
    if (!isUndefinedOrNull(search) && search !== "") query.name = new RegExp(escapeRegex(search), "i");
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      presetModel.find(query).select({ payload: 0 }).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      presetModel.countDocuments(query),
    ]);
    const advIds = [...new Set(rows.map((r) => r.advertiserId).filter(Boolean))];
    const netIds = [...new Set(rows.map((r) => r.networkId).filter(Boolean))];
    const [advs, nets] = await Promise.all([
      advertiserModel.find({ _id: { $in: advIds } }).select({ name: 1 }).lean(),
      networkModel.find({ _id: { $in: netIds }, orgId: reqBy.org_id }).select({ name: 1 }).lean(),
    ]);
    const advName = Object.fromEntries(advs.map((a) => [String(a._id), a.name]));
    const netName = Object.fromEntries(nets.map((n) => [String(n._id), n.name]));
    return {
      data: rows.map((r) => ({
        ...r,
        advertiserName: r.advertiserId ? advName[r.advertiserId] || null : null,
        networkName: netName[r.networkId] || null,
        visibility: r.visibility || VISIBILITY.PRIVATE,
        shared: isShared(reqBy, r),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  // Presets usable for an advertiser (its own plus the shared ones), or the
  // shared ones only when no advertiser is given.
  options: async ({ data, reqBy }) => {
    const query = { ...visibleTo(reqBy), kind: data.kind, status: notDeleted };
    query.advertiserId = data.advertiserId ? { $in: [data.advertiserId, null] } : null;
    if (isUndefinedOrNull(reqBy.network_id) && data.advertiserId) {
      const adv = await assertAdvertiser(data.advertiserId, reqBy);
      query.$or = usableBy(adv.networkId, true);
    }
    const rows = await presetModel.find(query).select({ name: 1, advertiserId: 1, networkId: 1 }).sort({ name: 1 }).lean();
    return rows.map((r) => ({ id: r._id, value: r.name, advertiserId: r.advertiserId, shared: isShared(reqBy, r) }));
  },

  getById: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid preset id");
    const row = await presetModel.findOne({ _id: id, ...visibleTo(reqBy), status: notDeleted }).lean();
    if (isUndefinedOrNull(row)) throw new Error(`No preset exists with id: ${id}`);
    return { data: { ...row, visibility: row.visibility || VISIBILITY.PRIVATE, shared: isShared(reqBy, row) } };
  },

  create: async ({ data, reqBy }) => {
    // An advertiser's preset belongs to the advertiser's network; any other
    // preset to the caller's network, or to the org at org level.
    const adv = await assertAdvertiser(data.advertiserId, reqBy);
    const networkId = adv ? adv.networkId || null : reqBy.network_id || null;
    assertVisibility(networkId, data.visibility);
    const saved = await new presetModel({
      ...data,
      orgId: reqBy.org_id,
      networkId,
      createdBy: reqBy.user_id || null,
      updatedBy: reqBy.user_id || null,
    }).save();
    return { message: "Preset saved", data: saved };
  },

  update: async ({ id, data, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid preset id");
    const existing = await presetModel.findOne({ _id: id, ...ownedBy(reqBy), status: notDeleted }).lean();
    if (isUndefinedOrNull(existing)) throw new Error(`No preset exists with id: ${id}`);
    assertVisibility(existing.networkId, data.visibility);
    const set = { ...data, updatedBy: reqBy.user_id || null };
    if (data.payload) {
      const r = PAYLOAD[existing.kind].validate(data.payload);
      if (r.error) throw new Error(`Preset settings: ${r.error.message}`);
      set.payload = r.value;
    }
    const updated = await presetModel.findOneAndUpdate({ _id: id, ...ownedBy(reqBy) }, { $set: set }, { new: true });
    return { message: "Preset updated", data: updated };
  },

  // Soft delete, refused while an advertiser uses it as a default.
  remove: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid preset id");
    const existing = await presetModel.findOne({ _id: id, ...ownedBy(reqBy), status: notDeleted }).lean();
    if (isUndefinedOrNull(existing)) throw new Error(`No preset exists with id: ${id}`);
    const users = await advertiserModel
      .find({ orgId: reqBy.org_id, status: notDeleted, [ADVERTISER_DEFAULT[existing.kind]]: id })
      .select({ name: 1 })
      .lean();
    if (users.length) {
      throw new Error(`${users.map((a) => a.name).join(", ")} use${users.length === 1 ? "s" : ""} this preset as a default. Change that first.`);
    }
    await presetModel.updateOne({ _id: id }, { $set: { status: STATUS.DELETED, updatedBy: reqBy.user_id || null } });
    return { message: "Preset deleted", data: { id } };
  },

  // Advertiser defaults: each id must be a preset of that kind that the
  // advertiser can use (its own, or shared with its network).
  assertDefaults: async ({ defaults, advertiserId, orgId, networkId, orgUser }) => {
    for (const [kind, path] of Object.entries(ADVERTISER_DEFAULT)) {
      const id = defaults && defaults[path.split(".")[1]];
      if (!id) continue;
      if (!isObjectId(id)) throw new Error("Invalid preset id");
      const p = await presetModel
        .findOne({ _id: id, orgId, status: notDeleted, $or: usableBy(networkId, orgUser) })
        .select({ advertiserId: 1, kind: 1 })
        .lean();
      if (isUndefinedOrNull(p)) throw new Error(`The default ${LABEL[kind]} preset doesn't exist or isn't shared with this network`);
      if (p.kind !== kind) throw new Error(`The default ${LABEL[kind]} preset is a ${LABEL[p.kind]} preset`);
      if (p.advertiserId && p.advertiserId !== String(advertiserId || "")) {
        throw new Error(`The default ${LABEL[kind]} preset belongs to another advertiser`);
      }
    }
  },
};

module.exports = presetService;
