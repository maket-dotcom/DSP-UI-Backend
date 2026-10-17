const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const { STATUS } = require("./constant");

// A network sits between an organization and its advertisers. The org gives
// each network its own logins; network users only see the network's
// advertisers, campaigns and reports. One org has many networks.
const networkSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true },
    name: { type: String, required: true },
    status: { type: String, default: STATUS.ACTIVE },
    adminId: { type: String, default: null }, // first network admin login
    contactName: { type: String, default: null },
    contactEmail: { type: String, default: null },
    // Campaigns the network creates wait for the org's approval.
    requireApproval: { type: Boolean, default: true },
    notes: { type: String, default: null },

    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

networkSchema.index({ orgId: 1, status: 1 });
networkSchema.index({ orgId: 1, name: 1 });

module.exports =
  mongoose.models.networkModel ||
  mongoose.model("networkModel", networkSchema);
