const mongoose = require("mongoose"),
  Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

const { STATUS } = require("./constant");

const conditionSchema = new Schema(
  {
    field: { type: String, required: true }, // see FIELD
    values: { type: [String], default: [] }, // any of these matches
  },
  { _id: false }
);

// A term: when every condition matches, the bid is multiplied by `multiplier`
// (0 = don't bid). Terms are tried in order; the first match wins.
const termSchema = new Schema(
  {
    conditions: { type: [conditionSchema], default: [] },
    multiplier: { type: Number, required: true },
  },
  { _id: false }
);

// A reusable bid modifier, owned by an advertiser and referenced by its line
// items (lineItem.bidModifierId). The modified bid is held within
// [minBid, maxBid] when those are set.
const bidModifierSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true },
    advertiserId: { type: String, required: true },
    name: { type: String, required: true },
    minBid: { type: Number, default: null },
    maxBid: { type: Number, default: null },
    terms: { type: [termSchema], default: [] },
    notes: { type: String, default: null },
    status: { type: String, default: STATUS.ACTIVE },

    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

bidModifierSchema.index({ orgId: 1, advertiserId: 1, status: 1 });

module.exports =
  mongoose.models.bidModifierModel ||
  mongoose.model("bidModifierModel", bidModifierSchema);
