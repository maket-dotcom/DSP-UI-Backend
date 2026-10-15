const mongoose = require("mongoose"),
  Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

const { STATUS, FORMAT, BIDDING_STRATEGY, PACING } = require("./constant");

const customGeoSchema = new Schema(
  {
    country: { type: String, default: null },
    state: { type: String, default: null },
    city: { type: String, default: null },
  },
  { _id: false }
);

const creativeRefSchema = new Schema(
  {
    creativeId: { type: String, required: true },
  },
  { _id: false }
);

// A line item is one way of buying a campaign: its own format, flight,
// budget, bid, targeting and creatives. The bid engine bids per line item.
const lineItemSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true },
    advertiserId: { type: String, required: true },
    campaignId: { type: String, required: true },

    name: { type: String, required: true },
    format: { type: String, default: FORMAT.BANNER },
    status: { type: String, default: STATUS.PAUSED },
    alternativeId: { type: String, default: null },
    notes: { type: String, default: null },

    // Flight: must sit inside the campaign's dates. null = inherit.
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },

    // In the campaign's budget type (spend or impressions). null = no own cap.
    budget: { type: Number, default: null },
    dailyBudget: { type: Number, default: null },
    pacing: { type: String, default: PACING.ASAP },

    bidding: {
      strategy: { type: String, default: BIDDING_STRATEGY.INHERIT },
      cpm: { type: Number, default: null },
      maxCpm: { type: Number, default: null },
    },

    targeting: {
      geo: {
        countries: {
          include: { type: [String], default: [] }, // [] = all countries
          exclude: { type: [String], default: [] },
        },
        custom: { type: [customGeoSchema], default: [] }, // country / state / city rows
      },
      segments: {
        audienceTarget: { type: String, default: "all" }, // all | custom
        customAudienceIds: { type: [String], default: [] },
      },
      exchange: {
        inventoryType: { type: String, default: "programmatic" },
        oemPremiumPartners: { type: [String], default: [] },
      },
    },

    creatives: { type: [creativeRefSchema], default: [] },

    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

lineItemSchema.index({ orgId: 1, campaignId: 1, status: 1 });
lineItemSchema.index({ campaignId: 1, status: 1 }); // bid engine load
lineItemSchema.index({ orgId: 1, "creatives.creativeId": 1 });

module.exports =
  mongoose.models.lineItemModel ||
  mongoose.model("lineItemModel", lineItemSchema);
