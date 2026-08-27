const supplyPartnerModel = require("./model");
const { STATUS } = require("./constant");
const { isUndefinedOrNull } = require("../../utils/validators");

require("dotenv").config();

const isObjectId = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);

// zoneId must be unique globally: within the payload AND against every other
// (non-deleted) partner — a mongo multikey unique index cannot enforce the
// cross-document rule cleanly, so we check here.
const assertZoneIdsUnique = async (zones, excludeId) => {
  if (!Array.isArray(zones) || zones.length === 0) return;

  const ids = zones.map((z) => z.zoneId);
  const dup = ids.find((id, i) => ids.indexOf(id) !== i);
  if (dup) throw new Error(`Duplicate zoneId in payload: ${dup}`);

  const clashQuery = {
    "zones.zoneId": { $in: ids },
    status: { $ne: STATUS.DELETED },
  };
  if (excludeId) clashQuery._id = { $ne: excludeId };
  const clash = await supplyPartnerModel.findOne(clashQuery).select("name zones.zoneId");
  if (!isUndefinedOrNull(clash)) {
    const taken = clash.zones.map((z) => z.zoneId).filter((id) => ids.includes(id));
    throw new Error(`zoneId already in use by "${clash.name}": ${taken.join(", ")}`);
  }
};

const supplyService = {
  // Paginated list for the super-admin table (excludes soft-deleted by default).
  list: async ({ data }) => {
    const { page, limit, status, kind, flow, search } = data;
    const match = {};
    match.status = status || { $ne: STATUS.DELETED };
    if (!isUndefinedOrNull(kind)) match.kind = kind;
    if (!isUndefinedOrNull(flow)) match.flow = flow;
    if (!isUndefinedOrNull(search) && search !== "") {
      match.name = new RegExp(search, "i");
    }

    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      supplyPartnerModel.find(match).sort({ createdAt: -1 }).skip(skip).limit(limit),
      supplyPartnerModel.countDocuments(match),
    ]);

    return {
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  getById: async ({ id }) => {
    if (!isObjectId(id)) throw new Error("Invalid supply partner id");
    const partner = await supplyPartnerModel.findOne({ _id: id, status: { $ne: STATUS.DELETED } });
    if (isUndefinedOrNull(partner)) throw new Error(`No supply partner exists with id: ${id}`);
    return { data: partner };
  },

  create: async ({ data, reqBy }) => {
    await assertZoneIdsUnique(data.zones, null);
    const partner = new supplyPartnerModel({
      ...data,
      createdBy: reqBy?.user_id || null,
      updatedBy: reqBy?.user_id || null,
    });
    const saved = await partner.save();
    return { message: "Supply partner created successfully.", data: saved };
  },

  update: async ({ id, data, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid supply partner id");
    if (data.zones) await assertZoneIdsUnique(data.zones, id);
    const updated = await supplyPartnerModel.findOneAndUpdate(
      { _id: id, status: { $ne: STATUS.DELETED } },
      { $set: { ...data, updatedBy: reqBy?.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No supply partner exists with id: ${id}`);
    return { message: "Supply partner updated successfully.", data: updated };
  },

  changeStatus: async ({ id, status, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid supply partner id");
    const updated = await supplyPartnerModel.findOneAndUpdate(
      { _id: id, status: { $ne: STATUS.DELETED } },
      { $set: { status, updatedBy: reqBy?.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No supply partner exists with id: ${id}`);
    return { message: `Supply partner ${status}.`, data: { id: updated._id, status } };
  },

  // Soft delete.
  remove: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid supply partner id");
    const updated = await supplyPartnerModel.findOneAndUpdate(
      { _id: id, status: { $ne: STATUS.DELETED } },
      { $set: { status: STATUS.DELETED, updatedBy: reqBy?.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No supply partner exists with id: ${id}`);
    return { message: "Supply partner deleted successfully.", data: { id: updated._id } };
  },
};

module.exports = supplyService;
