const targetingListModel = require("./model");
const lineItemModel = require("../lineItem/model");
const { STATUS, LINE_ITEM_FIELD } = require("./constant");
const { normalise } = require("./validation");
const { isUndefinedOrNull } = require("../../utils/validators");

const isObjectId = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const notDeleted = { $ne: STATUS.DELETED };

// Line items (not deleted) that reference a list, per list id.
const usage = async (orgId, ids) => {
  if (!ids.length) return {};
  const fields = Object.values(LINE_ITEM_FIELD);
  const rows = await lineItemModel.aggregate([
    {
      $match: {
        orgId,
        status: { $ne: "deleted" },
        $or: fields.flatMap((f) => [{ [`${f}.include`]: { $in: ids } }, { [`${f}.exclude`]: { $in: ids } }]),
      },
    },
    {
      $project: {
        lists: {
          $setUnion: fields.flatMap((f) => [{ $ifNull: [`$${f}.include`, []] }, { $ifNull: [`$${f}.exclude`, []] }]),
        },
      },
    },
    { $unwind: "$lists" },
    { $match: { lists: { $in: ids } } },
    { $group: { _id: "$lists", lineItems: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((r) => [r._id, r.lineItems]));
};

const targetingListService = {
  list: async ({ data, reqBy }) => {
    const { page, limit, kind, search } = data;
    const query = { orgId: reqBy.org_id, status: notDeleted };
    if (kind) query.kind = kind;
    if (!isUndefinedOrNull(search) && search !== "") query.name = new RegExp(escapeRegex(search), "i");
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      targetingListModel
        .aggregate([
          { $match: query },
          { $sort: { createdAt: -1, _id: -1 } },
          { $skip: skip },
          { $limit: limit },
          // The list page shows a count, not the (possibly huge) values.
          { $project: { name: 1, kind: 1, notes: 1, status: 1, createdAt: 1, updatedAt: 1, count: { $size: "$values" } } },
        ]),
      targetingListModel.countDocuments(query),
    ]);
    const used = await usage(reqBy.org_id, rows.map((r) => String(r._id)));
    return {
      data: rows.map((r) => ({ ...r, lineItems: used[String(r._id)] || 0 })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  // Lightweight list for the line item pickers.
  options: async ({ data, reqBy }) => {
    const rows = await targetingListModel.aggregate([
      { $match: { orgId: reqBy.org_id, kind: data.kind, status: notDeleted } },
      { $sort: { name: 1 } },
      { $project: { name: 1, count: { $size: "$values" } } },
    ]);
    return rows.map((r) => ({ id: r._id, value: r.name, count: r.count }));
  },

  getById: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid list id");
    const row = await targetingListModel.findOne({ _id: id, orgId: reqBy.org_id, status: notDeleted });
    if (isUndefinedOrNull(row)) throw new Error(`No targeting list exists with id: ${id}`);
    return { data: row };
  },

  create: async ({ data, reqBy }) => {
    const saved = await new targetingListModel({
      ...data,
      orgId: reqBy.org_id,
      createdBy: reqBy.user_id || null,
      updatedBy: reqBy.user_id || null,
    }).save();
    return { message: "Targeting list created successfully", data: { _id: saved._id, name: saved.name } };
  },

  update: async ({ id, data, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid list id");
    if (data.values) {
      const existing = await targetingListModel.findOne({ _id: id, orgId: reqBy.org_id, status: notDeleted }).select({ kind: 1 }).lean();
      if (isUndefinedOrNull(existing)) throw new Error(`No targeting list exists with id: ${id}`);
      data = { ...data, values: normalise(existing.kind, data.values) };
    }
    const updated = await targetingListModel.findOneAndUpdate(
      { _id: id, orgId: reqBy.org_id, status: notDeleted },
      { $set: { ...data, updatedBy: reqBy.user_id || null } },
      { new: true, projection: { name: 1 } }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No targeting list exists with id: ${id}`);
    return { message: "Targeting list updated successfully", data: updated };
  },

  // Soft delete, refused while a line item still uses the list: deleting it
  // would silently widen (include) or drop (exclude) that line item's targeting.
  remove: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid list id");
    const used = (await usage(reqBy.org_id, [id]))[id] || 0;
    if (used > 0) {
      throw new Error(`${used} line item(s) still use this list. Remove it from them first.`);
    }
    const updated = await targetingListModel.findOneAndUpdate(
      { _id: id, orgId: reqBy.org_id, status: notDeleted },
      { $set: { status: STATUS.DELETED, updatedBy: reqBy.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No targeting list exists with id: ${id}`);
    return { message: "Targeting list deleted successfully", data: { id: updated._id } };
  },

  // Used by line item create/update: every id must be the org's list of kind.
  assertBelongTo: async ({ ids, kind, orgId }) => {
    const unique = [...new Set(ids || [])];
    if (!unique.length) return;
    if (unique.some((id) => !isObjectId(id))) throw new Error("Invalid targeting list id");
    const found = await targetingListModel.countDocuments({ _id: { $in: unique }, orgId, kind, status: notDeleted });
    if (found !== unique.length) throw new Error("One or more targeting lists don't exist in your organization");
  },
};

module.exports = targetingListService;
