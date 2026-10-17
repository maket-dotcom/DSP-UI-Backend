const targetingListModel = require("./model");
const lineItemModel = require("../lineItem/model");
const networkModel = require("../network/model");
const { STATUS, LINE_ITEM_FIELD, VISIBILITY } = require("./constant");
const { normalise } = require("./validation");
const { isUndefinedOrNull } = require("../../utils/validators");

const isObjectId = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const notDeleted = { $ne: STATUS.DELETED };

// Lists the caller can see: inside a network (a network user, or an org user
// who entered one) its own lists plus the org's public ones; at org level
// every list in the org.
const visibleTo = (reqBy) =>
  isUndefinedOrNull(reqBy.network_id)
    ? { orgId: reqBy.org_id }
    : {
        orgId: reqBy.org_id,
        $or: [{ networkId: reqBy.network_id }, { networkId: null, visibility: VISIBILITY.PUBLIC }],
      };

// Lists the caller can change: its network's own, or any at org level.
const ownedBy = (reqBy) =>
  isUndefinedOrNull(reqBy.network_id)
    ? { orgId: reqBy.org_id }
    : { orgId: reqBy.org_id, networkId: reqBy.network_id };

// Network names for rows, keyed by network id.
const networkNames = async (orgId, ids) => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return {};
  const rows = await networkModel.find({ _id: { $in: unique }, orgId }).select({ name: 1 }).lean();
  return Object.fromEntries(rows.map((r) => [String(r._id), r.name]));
};

// An org list seen from inside a network is shared with it, read-only.
const isShared = (reqBy, row) => !isUndefinedOrNull(reqBy.network_id) && isUndefinedOrNull(row.networkId);

// The line items the caller sees.
const lineItemScope = (reqBy) =>
  isUndefinedOrNull(reqBy.network_id)
    ? { orgId: reqBy.org_id }
    : { orgId: reqBy.org_id, networkId: reqBy.network_id };

// Only organization lists can be public; a network's lists are private to it.
const assertVisibility = (networkId, visibility) => {
  if (!isUndefinedOrNull(networkId) && visibility === VISIBILITY.PUBLIC) {
    throw new Error("Only organization lists can be shared with networks. A network's lists are private to it.");
  }
};

// Line items (not deleted) matching `scope` that reference a list, per list id.
const usage = async (scope, ids) => {
  if (!ids.length) return {};
  const fields = Object.values(LINE_ITEM_FIELD);
  const rows = await lineItemModel.aggregate([
    {
      $match: {
        ...scope,
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
    const query = { ...visibleTo(reqBy), status: notDeleted };
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
          {
            $project: {
              name: 1, kind: 1, notes: 1, status: 1, networkId: 1, visibility: 1, createdAt: 1, updatedAt: 1,
              count: { $size: "$values" },
            },
          },
        ]),
      targetingListModel.countDocuments(query),
    ]);
    const [used, names] = await Promise.all([
      usage(lineItemScope(reqBy), rows.map((r) => String(r._id))),
      networkNames(reqBy.org_id, rows.map((r) => r.networkId)),
    ]);
    return {
      data: rows.map((r) => ({
        ...r,
        networkName: names[r.networkId] || null,
        visibility: r.visibility || VISIBILITY.PRIVATE,
        shared: isShared(reqBy, r),
        lineItems: used[String(r._id)] || 0,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  // Lightweight list for the line item pickers. At org level, networkId (the
  // campaign's network) keeps it to the lists that network's line items can use.
  options: async ({ data, reqBy }) => {
    const match = { ...visibleTo(reqBy), kind: data.kind, status: notDeleted };
    if (isUndefinedOrNull(reqBy.network_id) && data.networkId) {
      match.$or = [{ networkId: null }, { networkId: data.networkId }];
    }
    const rows = await targetingListModel.aggregate([
      { $match: match },
      { $sort: { name: 1 } },
      { $project: { name: 1, networkId: 1, count: { $size: "$values" } } },
    ]);
    return rows.map((r) => ({ id: r._id, value: r.name, count: r.count, shared: isShared(reqBy, r) }));
  },

  getById: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid list id");
    const row = await targetingListModel.findOne({ _id: id, ...visibleTo(reqBy), status: notDeleted }).lean();
    if (isUndefinedOrNull(row)) throw new Error(`No targeting list exists with id: ${id}`);
    const names = await networkNames(reqBy.org_id, [row.networkId]);
    return {
      data: {
        ...row,
        networkName: names[row.networkId] || null,
        visibility: row.visibility || VISIBILITY.PRIVATE,
        shared: isShared(reqBy, row),
      },
    };
  },

  create: async ({ data, reqBy }) => {
    assertVisibility(reqBy.network_id, data.visibility);
    const saved = await new targetingListModel({
      ...data,
      orgId: reqBy.org_id,
      networkId: reqBy.network_id || null,
      createdBy: reqBy.user_id || null,
      updatedBy: reqBy.user_id || null,
    }).save();
    return { message: "Targeting list created successfully", data: { _id: saved._id, name: saved.name } };
  },

  update: async ({ id, data, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid list id");
    const existing = await targetingListModel.findOne({ _id: id, ...ownedBy(reqBy), status: notDeleted }).select({ kind: 1, networkId: 1 }).lean();
    if (isUndefinedOrNull(existing)) throw new Error(`No targeting list exists with id: ${id}`);
    assertVisibility(existing.networkId, data.visibility);
    if (data.values) data = { ...data, values: normalise(existing.kind, data.values) };
    // Making an org list private again would hide it from the network line items using it.
    if (data.visibility === VISIBILITY.PRIVATE && isUndefinedOrNull(existing.networkId)) {
      const inNetworks = (await usage({ orgId: reqBy.org_id, networkId: { $ne: null } }, [id]))[id] || 0;
      if (inNetworks > 0) {
        throw new Error(`${inNetworks} network line item(s) use this list. Remove it from them before making it private.`);
      }
    }
    const updated = await targetingListModel.findOneAndUpdate(
      { _id: id, ...ownedBy(reqBy), status: notDeleted },
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
    const used = (await usage({ orgId: reqBy.org_id }, [id]))[id] || 0;
    if (used > 0) {
      throw new Error(`${used} line item(s) still use this list. Remove it from them first.`);
    }
    const updated = await targetingListModel.findOneAndUpdate(
      { _id: id, ...ownedBy(reqBy), status: notDeleted },
      { $set: { status: STATUS.DELETED, updatedBy: reqBy.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No targeting list exists with id: ${id}`);
    return { message: "Targeting list deleted successfully", data: { id: updated._id } };
  },

  // Used by line item create/update: every id must be a list of `kind` that
  // the campaign's network can use: its own lists, and the org's public ones
  // (org users may also use the org's private lists).
  assertBelongTo: async ({ ids, kind, orgId, networkId, orgUser }) => {
    const unique = [...new Set(ids || [])];
    if (!unique.length) return;
    if (unique.some((id) => !isObjectId(id))) throw new Error("Invalid targeting list id");
    const usable = [{ networkId: null, ...(orgUser ? {} : { visibility: VISIBILITY.PUBLIC }) }];
    if (!isUndefinedOrNull(networkId)) usable.push({ networkId });
    const found = await targetingListModel.countDocuments({ _id: { $in: unique }, orgId, kind, status: notDeleted, $or: usable });
    if (found !== unique.length) throw new Error("One or more targeting lists don't exist or aren't shared with this network");
  },
};

module.exports = targetingListService;
