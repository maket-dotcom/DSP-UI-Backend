const presetModel = require("./model");
const advertiserModel = require("../advertiser/model");
const { STATUS, ADVERTISER_DEFAULT } = require("./constant");
const { PAYLOAD } = require("./validation");
const { isUndefinedOrNull } = require("../../utils/validators");

const isObjectId = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const notDeleted = { $ne: STATUS.DELETED };
const LABEL = { campaign: "campaign", lineItem: "line item", targeting: "targeting" };

const assertAdvertiser = async (advertiserId, orgId) => {
  if (!advertiserId) return;
  const n = await advertiserModel.countDocuments({ _id: advertiserId, orgId, status: notDeleted });
  if (!n) throw new Error(`No advertiser exists with id: ${advertiserId}`);
};

const presetService = {
  list: async ({ data, reqBy }) => {
    const { page, limit, kind, advertiserId, search } = data;
    const query = { orgId: reqBy.org_id, status: notDeleted };
    if (kind) query.kind = kind;
    if (advertiserId) query.advertiserId = { $in: [advertiserId, null] };
    if (!isUndefinedOrNull(search) && search !== "") query.name = new RegExp(escapeRegex(search), "i");
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      presetModel.find(query).select({ payload: 0 }).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      presetModel.countDocuments(query),
    ]);
    const advIds = [...new Set(rows.map((r) => r.advertiserId).filter(Boolean))];
    const advs = await advertiserModel.find({ _id: { $in: advIds } }).select({ name: 1 }).lean();
    const advName = Object.fromEntries(advs.map((a) => [String(a._id), a.name]));
    return {
      data: rows.map((r) => ({ ...r, advertiserName: r.advertiserId ? advName[r.advertiserId] || null : null })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  options: async ({ data, reqBy }) => {
    const query = { orgId: reqBy.org_id, kind: data.kind, status: notDeleted };
    query.advertiserId = data.advertiserId ? { $in: [data.advertiserId, null] } : null;
    const rows = await presetModel.find(query).select({ name: 1, advertiserId: 1 }).sort({ name: 1 }).lean();
    return rows.map((r) => ({ id: r._id, value: r.name, advertiserId: r.advertiserId }));
  },

  getById: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid preset id");
    const row = await presetModel.findOne({ _id: id, orgId: reqBy.org_id, status: notDeleted });
    if (isUndefinedOrNull(row)) throw new Error(`No preset exists with id: ${id}`);
    return { data: row };
  },

  create: async ({ data, reqBy }) => {
    await assertAdvertiser(data.advertiserId, reqBy.org_id);
    const saved = await new presetModel({
      ...data,
      orgId: reqBy.org_id,
      createdBy: reqBy.user_id || null,
      updatedBy: reqBy.user_id || null,
    }).save();
    return { message: "Preset saved", data: saved };
  },

  update: async ({ id, data, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid preset id");
    const existing = await presetModel.findOne({ _id: id, orgId: reqBy.org_id, status: notDeleted }).lean();
    if (isUndefinedOrNull(existing)) throw new Error(`No preset exists with id: ${id}`);
    const set = { ...data, updatedBy: reqBy.user_id || null };
    if (data.payload) {
      const r = PAYLOAD[existing.kind].validate(data.payload);
      if (r.error) throw new Error(`Preset settings: ${r.error.message}`);
      set.payload = r.value;
    }
    const updated = await presetModel.findOneAndUpdate({ _id: id, orgId: reqBy.org_id }, { $set: set }, { new: true });
    return { message: "Preset updated", data: updated };
  },

  // Soft delete, refused while an advertiser uses it as a default.
  remove: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid preset id");
    const existing = await presetModel.findOne({ _id: id, orgId: reqBy.org_id, status: notDeleted }).lean();
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
  // advertiser can use (its own or org-wide).
  assertDefaults: async ({ defaults, advertiserId, orgId }) => {
    for (const [kind, path] of Object.entries(ADVERTISER_DEFAULT)) {
      const id = defaults && defaults[path.split(".")[1]];
      if (!id) continue;
      if (!isObjectId(id)) throw new Error("Invalid preset id");
      const p = await presetModel.findOne({ _id: id, orgId, status: notDeleted }).select({ advertiserId: 1, kind: 1 }).lean();
      if (isUndefinedOrNull(p)) throw new Error(`The default ${LABEL[kind]} preset doesn't exist`);
      if (p.kind !== kind) throw new Error(`The default ${LABEL[kind]} preset is a ${LABEL[p.kind]} preset`);
      if (p.advertiserId && p.advertiserId !== String(advertiserId || "")) {
        throw new Error(`The default ${LABEL[kind]} preset belongs to another advertiser`);
      }
    }
  },
};

module.exports = presetService;
