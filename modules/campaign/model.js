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
    }
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

var campaignSchema = new mongoose.Schema(
  {
    orgId: String,

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
    kpi: String,
    isScheduling: Boolean,
    startDate: Date,
    endDate: Date,

    mmpPlatform: String,
    ctaUrl: String,
    vtaUrl: String,
    eventDetails: [eventDetailsSchema],


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
  },
  { timestamps: true }
);
module.exports =
  mongoose.models.campaignModel ||
  mongoose.model("campaignModel", campaignSchema);
