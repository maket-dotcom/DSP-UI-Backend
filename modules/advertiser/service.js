const advertiserModel = require("./model");
const campaignModel = require("../campaign/model");
const { STATUS, CATEGORY } = require("./constant");
const { isUndefinedOrNull } = require("../../utils/validators");
const { uploadAppIcon } = require("../../utils/appIcon");

const isObjectId = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const notDeleted = { $ne: STATUS.DELETED };

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
    const query = { orgId: reqBy.org_id, status: status || notDeleted };
    if (!isUndefinedOrNull(search) && search !== "") {
      const rx = new RegExp(escapeRegex(search), "i");
      query.$or = [{ name: rx }, { appBundle: rx }, { domain: rx }];
    }
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      advertiserModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      advertiserModel.countDocuments(query),
    ]);
    const counts = await campaignCounts(reqBy.org_id, rows.map((r) => String(r._id)));
    return {
      data: rows.map((r) => ({
        ...r,
        categoryName: CATEGORY[r.category] || null,
        campaigns: counts[String(r._id)] || { total: 0, active: 0 },
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  // Lightweight list for dropdowns.
  options: async ({ reqBy }) => {
    const rows = await advertiserModel
      .find({ orgId: reqBy.org_id, status: notDeleted })
      .select({ name: 1, status: 1 })
      .sort({ name: 1 });
    return rows.map((r) => ({ id: r._id, value: r.name, status: r.status }));
  },

  categories: async () =>
    Object.entries(CATEGORY).map(([code, name]) => ({ id: code, value: `${name} (${code})` })),

  getById: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid advertiser id");
    const adv = await advertiserModel.findOne({ _id: id, orgId: reqBy.org_id, status: notDeleted });
    if (isUndefinedOrNull(adv)) throw new Error(`No advertiser exists with id: ${id}`);
    return { data: adv };
  },

  create: async ({ data, reqBy }) => {
    const payload = await withBucketIcon({ ...data }, reqBy.org_id);
    const saved = await new advertiserModel({
      ...payload,
      orgId: reqBy.org_id,
      createdBy: reqBy.user_id || null,
      updatedBy: reqBy.user_id || null,
    }).save();
    return { message: "Advertiser created successfully", data: saved };
  },

  update: async ({ id, data, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid advertiser id");
    const payload = await withBucketIcon({ ...data }, reqBy.org_id);
    const updated = await advertiserModel.findOneAndUpdate(
      { _id: id, orgId: reqBy.org_id, status: notDeleted },
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
      { _id: id, orgId: reqBy.org_id, status: notDeleted },
      { $set: { status, updatedBy: reqBy.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No advertiser exists with id: ${id}`);
    return { message: `Advertiser ${status}.`, data: { id: updated._id, status } };
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
      { _id: id, orgId: reqBy.org_id, status: notDeleted },
      { $set: { status: STATUS.DELETED, updatedBy: reqBy.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No advertiser exists with id: ${id}`);
    return { message: "Advertiser deleted successfully", data: { id: updated._id } };
  },

  // Used by campaign create/update: the advertiser must exist in the caller's org.
  assertUsable: async ({ id, orgId }) => {
    if (!isObjectId(id)) throw new Error("Invalid advertiser id");
    const adv = await advertiserModel.findOne({ _id: id, orgId, status: notDeleted }).lean();
    if (isUndefinedOrNull(adv)) throw new Error(`No advertiser exists with id: ${id}`);
    return adv;
  },
};

module.exports = advertiserService;
