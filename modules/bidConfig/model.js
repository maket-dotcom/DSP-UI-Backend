const mongoose = require("mongoose"),
  Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

const { STATUS, GLOBAL_KEY, DEFAULT_CURRENCY } = require("./constant");

// One override entry: a targeted campaign + the CPM to bid for it.
const campaignBidSchema = new Schema(
  {
    campaignId: { type: String, required: true }, // campaignModel _id (hex)
    campaignTitle: { type: String, default: null }, // denormalized for readability in UI
    bidPrice: { type: Number, required: true }, // CPM bid for this campaign
    currency: { type: String, default: DEFAULT_CURRENCY },
    enabled: { type: Boolean, default: true }, // toggle without removing
    maxBidPrice: { type: Number, default: null }, // optional safety cap
    note: { type: String, default: null },
  },
  { _id: false }
);

// Singleton bid configuration. Exactly one document exists, keyed by `key`
// (always "global"); managed by super admins only.
const bidConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: GLOBAL_KEY, unique: true, index: true },
    name: { type: String, default: "Global Bid Configuration" },
    status: { type: String, default: STATUS.ACTIVE }, // master on/off switch

    // Fallback bid when a serving campaign is NOT listed in campaignBids
    // (mirrors the engine's DEFAULT_BID_CPM). null = no fallback.
    defaultBidPrice: { type: Number, default: null },
    defaultCurrency: { type: String, default: DEFAULT_CURRENCY },

    // The per-campaign bid overrides ("targeted campaigns + pricing").
    campaignBids: { type: [campaignBidSchema], default: [] },

    // Audit (super-admin userId).
    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.bidConfigModel ||
  mongoose.model("bidConfigModel", bidConfigSchema);
