const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const { STATUS, DEFAULT_CURRENCY } = require("./constant");

// An advertiser is the brand / app owner. An organization (the account) can
// run many advertisers; each advertiser owns campaigns, and its defaults
// prefill every new campaign.
const advertiserSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true },
    // The network the advertiser belongs to; fixed once created.
    networkId: { type: String, default: null },

    // --- Essential settings ---
    name: { type: String, required: true },
    domain: { type: String, default: null }, // https://… — also the default adomain
    appBundle: { type: String, default: null }, // default app for its campaigns
    appName: { type: String, default: null },
    appOs: { type: String, default: null }, // android | ios
    appIconLink: { type: String, default: null }, // our bucket URL
    category: { type: String, default: null }, // IAB code, e.g. "IAB13"
    alternativeId: { type: String, default: null },
    notes: { type: String, default: null },
    status: { type: String, default: STATUS.ACTIVE },

    // --- Defaults inherited by new campaigns / line items ---
    defaults: {
      geo: { type: [String], default: [] }, // country codes for new line items
      currency: { type: String, default: DEFAULT_CURRENCY },
      clickUrl: { type: String, default: null }, // prefill for campaign CTA URL
      mmpPlatform: { type: String, default: null },
      // Presets that prefill its new campaigns / line items / targeting.
      campaignPresetId: { type: String, default: null },
      lineItemPresetId: { type: String, default: null },
      targetingPresetId: { type: String, default: null },
    },

    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

advertiserSchema.index({ orgId: 1, status: 1 });
advertiserSchema.index({ orgId: 1, networkId: 1, status: 1 });
advertiserSchema.index({ orgId: 1, name: 1 });

module.exports =
  mongoose.models.advertiserModel ||
  mongoose.model("advertiserModel", advertiserSchema);
