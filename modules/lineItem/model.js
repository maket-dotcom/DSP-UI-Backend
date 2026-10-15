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

// { include: [], exclude: [] } — [] include = no limit.
const includeExclude = (type) => ({
  include: { type: [type], default: [] },
  exclude: { type: [type], default: [] },
});

const segmentRefSchema = new Schema(
  {
    campaignId: { type: String, default: null }, // null = this line item's campaign
    segment: { type: String, default: "any" }, // clickers | viewers | any
  },
  { _id: false }
);

const freqCapSchema = new Schema(
  {
    count: { type: Number, required: true },
    every: { type: Number, required: true },
    unit: { type: String, required: true }, // hour | day | week
  },
  { _id: false }
);

const flightSchema = new Schema(
  {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    budget: { type: Number, default: null }, // in the campaign's budget type
  },
  { _id: false }
);

const creativeRefSchema = new Schema(
  {
    creativeId: { type: String, required: true },
    // Rotation share among the line item's equally good creatives for an
    // impression (same size / fitting duration): 3 serves 3× as often as 1.
    weight: { type: Number, default: 1 },
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
    // Per-user impression caps on this line item, on top of the campaign's.
    frequencyCaps: { type: [freqCapSchema], default: [] },
    // Bursts: when set, the line item only bids inside a flight, and a
    // flight's budget caps delivery within it.
    flights: { type: [flightSchema], default: [] },
    bidModifierId: { type: String, default: null }, // bidmodifier _id
    deliveryModifierId: { type: String, default: null }, // deliverymodifier _id

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
        metros: includeExclude(String), // DMA codes (device.geo.metro)
        zips: includeExclude(String), // lower-cased, no spaces
        zipLists: includeExclude(String), // targetinglist ids (kind zip)
      },
      // App/Site: app bundles (app) or domains (web), inline or via lists.
      inventory: {
        bundles: includeExclude(String),
        bundleLists: includeExclude(String), // targetinglist ids
        // PMP deals: includes make the line item deal-only; an impression
        // offering an excluded deal is skipped.
        deals: includeExclude(String),
        dealLists: includeExclude(String), // targetinglist ids (kind deal)
      },
      content: {
        categories: includeExclude(String), // IAB codes; IAB9 covers IAB9-30
        languages: includeExclude(String), // ISO 639-1
      },
      environment: {
        channels: { type: [String], default: [] }, // app | web; [] = both
      },
      platform: {
        deviceTypes: includeExclude(Number), // OpenRTB devicetype
        connectionTypes: includeExclude(Number), // OpenRTB connectiontype
        makes: includeExclude(String), // lower-cased
        models: includeExclude(String),
        carriers: includeExclude(String),
        osVersion: {
          min: { type: String, default: null },
          max: { type: String, default: null },
        },
      },
      // Hour-of-week grid: slot = day * 24 + hour, Monday 00:00 = 0, in
      // `timezone`. [] = every hour.
      time: {
        timezone: { type: String, default: null },
        slots: { type: [Number], default: [] },
      },
      segments: {
        audienceTarget: { type: String, default: "all" }, // all | custom
        customAudienceIds: { type: [String], default: [] },
        retargeting: {
          include: { type: [segmentRefSchema], default: [] }, // in at least one
          exclude: { type: [segmentRefSchema], default: [] }, // in none
        },
        requireDeviceId: { type: Boolean, default: false },
      },
      exchange: {
        inventoryType: { type: String, default: "programmatic" },
        oemPremiumPartners: { type: [String], default: [] },
        supplyPartners: includeExclude(String), // supply partner ids
        zones: includeExclude(String), // ?zone= ids
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
