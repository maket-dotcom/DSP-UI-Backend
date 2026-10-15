const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const { STATUS, TYPE } = require("./constant");

// A creative belongs to an advertiser and can be attached to any of its line
// items. When created from an upload, its _id IS the media upload's id, so the
// creative id stamped on bids, events and reports stays the same id the
// campaign form used before creatives became their own collection.
const creativeSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true },
    advertiserId: { type: String, required: true },
    name: { type: String, default: null },
    type: { type: String, default: TYPE.IMAGE }, // image | video
    status: { type: String, default: STATUS.ACTIVE },

    // Same fields the campaign's embedded media used.
    link: { type: String, default: null }, // hosted image / video URL
    w: { type: Number, default: null },
    h: { type: Number, default: null },
    duration: { type: Number }, // video seconds
    vastTag: { type: String }, // 3rd-party VAST tag URL (wrapper)
    mime: { type: String }, // e.g. video/mp4

    clickUrl: { type: String, default: null }, // overrides the campaign CTA when set

    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

creativeSchema.index({ orgId: 1, advertiserId: 1, status: 1 });

module.exports =
  mongoose.models.creativeModel ||
  mongoose.model("creativeModel", creativeSchema);
