const demandPartnerModel = require("./model");
const { STATUS } = require("./constant");
const { isUndefinedOrNull } = require("../../utils/validators");

require("dotenv").config();

const isObjectId = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);

const demandService = {
  // Paginated list for the super-admin table (excludes soft-deleted by default).
  list: async ({ data }) => {
    const { page, limit, status, partnerKind, integration, search } = data;
    const match = {};
    match.status = status || { $ne: STATUS.DELETED };
    if (!isUndefinedOrNull(partnerKind)) match.partnerKind = partnerKind;
    if (!isUndefinedOrNull(integration)) match.integration = integration;
    if (!isUndefinedOrNull(search) && search !== "") {
      match.name = new RegExp(search, "i");
    }

    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      demandPartnerModel.find(match).sort({ createdAt: -1 }).skip(skip).limit(limit),
      demandPartnerModel.countDocuments(match),
    ]);

    return {
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  getById: async ({ id }) => {
    if (!isObjectId(id)) throw new Error("Invalid demand partner id");
    const partner = await demandPartnerModel.findOne({ _id: id, status: { $ne: STATUS.DELETED } });
    if (isUndefinedOrNull(partner)) throw new Error(`No demand partner exists with id: ${id}`);
    return { data: partner };
  },

  create: async ({ data, reqBy }) => {
    const partner = new demandPartnerModel({
      ...data,
      createdBy: reqBy?.user_id || null,
      updatedBy: reqBy?.user_id || null,
    });
    const saved = await partner.save();
    return { message: "Demand partner created successfully.", data: saved };
  },

  update: async ({ id, data, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid demand partner id");
    const updated = await demandPartnerModel.findOneAndUpdate(
      { _id: id, status: { $ne: STATUS.DELETED } },
      { $set: { ...data, updatedBy: reqBy?.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No demand partner exists with id: ${id}`);
    return { message: "Demand partner updated successfully.", data: updated };
  },

  changeStatus: async ({ id, status, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid demand partner id");
    const updated = await demandPartnerModel.findOneAndUpdate(
      { _id: id, status: { $ne: STATUS.DELETED } },
      { $set: { status, updatedBy: reqBy?.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No demand partner exists with id: ${id}`);
    return { message: `Demand partner ${status}.`, data: { id: updated._id, status } };
  },

  // Soft delete.
  remove: async ({ id, reqBy }) => {
    if (!isObjectId(id)) throw new Error("Invalid demand partner id");
    const updated = await demandPartnerModel.findOneAndUpdate(
      { _id: id, status: { $ne: STATUS.DELETED } },
      { $set: { status: STATUS.DELETED, updatedBy: reqBy?.user_id || null } },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error(`No demand partner exists with id: ${id}`);
    return { message: "Demand partner deleted successfully.", data: { id: updated._id } };
  },
};

module.exports = demandService;
