const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const { STATUS, KIND, VISIBILITY } = require("./constant");

// A reusable targeting list, e.g. "ST_Vid_iOS": app bundles (or site domains)
// that line items include or exclude by reference. Editing the list changes
// every line item that uses it on the bid engine's next refresh.
const targetingListSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true },
    networkId: { type: String, default: null }, // null = an organization list
    visibility: { type: String, default: VISIBILITY.PRIVATE },
    name: { type: String, required: true },
    kind: { type: String, default: KIND.BUNDLE },
    values: { type: [String], default: [] }, // trimmed, lower-cased, unique
    notes: { type: String, default: null },
    status: { type: String, default: STATUS.ACTIVE },

    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

targetingListSchema.index({ orgId: 1, kind: 1, status: 1 });
targetingListSchema.index({ orgId: 1, networkId: 1, kind: 1, status: 1 });

module.exports =
  mongoose.models.targetingListModel ||
  mongoose.model("targetingListModel", targetingListSchema);
