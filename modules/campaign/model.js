const mongoose = require("mongoose"),
  Schema = mongoose.Schema;
mongoose.Promise = global.Promise;


const mediaSchema = new Schema(
  {
    id: {
      type: String,
      default: null,
    },
    link: {
      type: String,
      default: null,
    },
    type: {
      type: String,
      default: null,
    },
    w: {
      type: Number,
      default: null,
    },
    h: {
      type: Number,
      default: null,
    },
    // --- Video / CTV fields (only set when type === "video") ---
    // No default: an image creative simply omits them instead of storing null.
    duration: {
      type: Number, // seconds
    },
    vastTag: {
      type: String, // 3rd-party VAST tag URL (wrapper); empty for a self-hosted video
    },
    mime: {
      type: String, // e.g. "video/mp4"
    },
  },
  { _id: false }
);

const eventDetailsSchema = new Schema(
  {
    name: { type: String, default: null },
    bidPrice: { type: String, default: null },
    currency: { type: String, default: null },
  },
  { _id: false }
);

const customTargating = new Schema(
  {
    country: { type: String, default: null },
    state: { type: String, default: null },
    city: { type: String, default: null },
  },
  { _id: false }
);

// MCP text ad for a campaign the advertiser opted in (mcpEnabled). Written
// by super admin from the campaign's existing creative + CTA; read by
// MCP-BID-BIDDER, which only serves reviewStatus "approved".
const mcpCreativeSchema = new Schema(
  {
    advertiser: { type: String, default: null },
    title: { type: String, default: null },
    description: { type: String, default: null },
    cta: { type: String, default: null },
    destinationUrl: { type: String, default: null }, // defaults to the campaign ctaUrl; {macros} filled at click
    displayDomain: { type: String, default: null },
    imageUrl: { type: String, default: null }, // one of the campaign's existing media images
  },
  { _id: false }
);

const mcpSchema = new Schema(
  {
    pricingModel: { type: String, default: "cpc" },
    bid: { type: Number, default: null }, // USD per valid click
    categories: { type: [String], default: [] },
    intents: { type: [String], default: [] },
    keywords: { type: [String], default: [] },
    negativeKeywords: { type: [String], default: [] },
    hosts: { type: [String], default: [] }, // [] = every MCP host
    excludeMcpServerIds: { type: [String], default: [] },
    frequencyCapPerSession: { type: Number, default: 1 },
    dailyBudget: { type: Number, default: null }, // USD cap for MCP spend; null = campaign dailyBudget
    creative: { type: mcpCreativeSchema, default: null },
    reviewStatus: { type: String, default: "pending" }, // pending | approved | rejected
    reviewNotes: { type: String, default: null },
    reviewedAt: { type: Date, default: null },
    reviewedBy: { type: String, default: null },
  },
  { _id: false }
);

var campaignSchema = new mongoose.Schema(
  {
    orgId: String,
    // Advertiser that owns this campaign (Organization → Advertiser → Campaign
    // → Line Item). Missing only on campaigns created before advertisers.
    advertiserId: { type: String, default: null },
    // The advertiser's network, copied so lists and the engine filter without a join.
    networkId: { type: String, default: null },

    // The org's approval of what a network created or changed (modules/approval).
    // Missing = approved (records from before approvals).
    approval: {
      status: { type: String },
      note: { type: String },
      changes: { type: [String], default: undefined }, // fields changed since the last approval
      submittedBy: { type: String },
      submittedAt: { type: Date },
      reviewedBy: { type: String },
      reviewedAt: { type: Date },
    },

    title: String,
    goal: String,
    type: String,

    status: String,

    // Whether this campaign is eligible to bid in the engine.
    // Managed exclusively by super admin via the bid-config module.
    enableBidding: { type: Boolean, default: false },

    currency: String,
    bundleId: String,
    appOs: String,
    appName: String,
    appIconLink: String,
    budget: String,
    dailyBudget: String,
    budgetType: { type: String, default: "spend" }, // spend | impressions
    // Per-user impression caps across all the campaign's line items,
    // e.g. [{ count: 3, every: 1, unit: "day" }]. The stricter of these and a
    // line item's own caps wins.
    frequencyCaps: {
      type: [{ _id: false, count: Number, every: Number, unit: String }],
      default: [],
    },
    alternativeId: { type: String, default: null },
    notes: { type: String, default: null },
    kpi: String,
    isScheduling: Boolean,
    startDate: Date,
    endDate: Date,

    mmpPlatform: String,
    ctaUrl: String,
    vtaUrl: String,
    eventDetails: [eventDetailsSchema],


    // ---- Targeting + media below now live on LINE ITEMS (lineitemmodels /
    // creativemodels). Kept here only for campaigns not yet migrated: the bid
    // engine bids those through a synthetic line item built from these fields.
    geo: [String], // geo locations
    isCustomTargating: Boolean,
    customTargating: [customTargating],

    audienceTarget: { type: String, enum: ['all', 'custom'] },
    // for now commenting this
    // we will create a module for custom audience and add theri ids here 
    customAudienceIds: [String],

    inventoryType: { type: String, enum: ['programmatic', 'oem_premium_partners'] },
    // if inventoryType is  oem_premium_partners so we use add ids of all in below array
    oemPremiumPartners: [String],


    media: [mediaSchema],

    // Advertiser opt-in to also run on MCP; super admin configures `mcp`.
    mcpEnabled: { type: Boolean, default: false },
    mcpRequestedAt: { type: Date, default: null },
    mcp: { type: mcpSchema, default: undefined },
  },
  { timestamps: true }
);
campaignSchema.index({ orgId: 1, "approval.status": 1 }); // approval queue
campaignSchema.index({ orgId: 1, advertiserId: 1, status: 1 });
campaignSchema.index({ orgId: 1, networkId: 1, status: 1 });

module.exports =
  mongoose.models.campaignModel ||
  mongoose.model("campaignModel", campaignSchema);
