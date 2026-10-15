const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const { STATUS } = require("./constant");

// Saved settings that prefill a new campaign, line item or line item
// targeting. advertiserId null = usable by every advertiser in the org.
const presetSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true },
    advertiserId: { type: String, default: null },
    kind: { type: String, required: true }, // campaign | lineItem | targeting
    name: { type: String, required: true },
    payload: { type: mongoose.Schema.Types.Mixed, default: {} }, // validated per kind
    notes: { type: String, default: null },
    status: { type: String, default: STATUS.ACTIVE },

    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true, minimize: false }
);

presetSchema.index({ orgId: 1, kind: 1, advertiserId: 1, status: 1 });

module.exports = mongoose.models.presetModel || mongoose.model("presetModel", presetSchema);
