const mongoose = require("mongoose"),
  Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

const { STATUS } = require("./constant");

const conditionSchema = new Schema(
  {
    field: { type: String, required: true }, // same fields as bid modifiers
    values: { type: [String], default: [] }, // any of these matches
  },
  { _id: false }
);

// A term: when every condition matches, the line item bids on `share` percent
// of those requests (0 = never). Terms are tried in order; the first match
// wins; requests matching no term are always bid on.
const termSchema = new Schema(
  {
    conditions: { type: [conditionSchema], default: [] },
    share: { type: Number, required: true }, // 0–100
  },
  { _id: false }
);

// A reusable delivery modifier, owned by an advertiser and referenced by its
// line items (lineItem.deliveryModifierId). It changes how often a line item
// takes part, not what it bids.
const deliveryModifierSchema = new mongoose.Schema(
  {
    orgId: { type: String, required: true },
    advertiserId: { type: String, required: true },
    name: { type: String, required: true },
    terms: { type: [termSchema], default: [] },
    notes: { type: String, default: null },
    status: { type: String, default: STATUS.ACTIVE },

    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

deliveryModifierSchema.index({ orgId: 1, advertiserId: 1, status: 1 });

module.exports =
  mongoose.models.deliveryModifierModel ||
  mongoose.model("deliveryModifierModel", deliveryModifierSchema);
