const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

// One row of an exchange inventory report: an app (bundle or name) seen on
// one exchange and device type, with its request volume over the report's
// window. Rows are replaced as a whole per country + kind on each upload.
const inventoryAppSchema = new mongoose.Schema(
  {
    country: { type: String, required: true }, // ISO-2, e.g. IN
    kind: { type: String, required: true }, // bundle | name
    key: { type: String, required: true }, // bundle (lower-case) or app / site name
    exchange: { type: String, default: null }, // e.g. RUBICON
    deviceType: { type: String, default: null }, // e.g. Mobile/Tablet
    requests: { type: Number, default: 0 },
    uploadId: { type: String, default: null },
  },
  { timestamps: true }
);

inventoryAppSchema.index({ country: 1, kind: 1, key: 1 });
inventoryAppSchema.index({ country: 1, kind: 1, requests: -1 });

// One upload of a report file: what was loaded, when and by whom.
const inventoryUploadSchema = new mongoose.Schema(
  {
    country: { type: String, required: true },
    kind: { type: String, required: true },
    fileName: { type: String, default: null },
    rows: { type: Number, default: 0 },
    apps: { type: Number, default: 0 },
    requests: { type: Number, default: 0 },
    uploadedBy: { type: String, default: null },
  },
  { timestamps: true }
);

inventoryUploadSchema.index({ country: 1, kind: 1, createdAt: -1 });

module.exports = {
  inventoryAppModel:
    mongoose.models.inventoryAppModel || mongoose.model("inventoryAppModel", inventoryAppSchema),
  inventoryUploadModel:
    mongoose.models.inventoryUploadModel || mongoose.model("inventoryUploadModel", inventoryUploadSchema),
};
