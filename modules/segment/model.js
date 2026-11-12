const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

// How the bid engine decides a "request" segment; see rules.js. Empty
// fields don't apply.
const ruleSchema = new mongoose.Schema(
  {
    country: { type: String, default: null },
    regions: { type: [String], default: undefined },
    cities: { type: [String], default: undefined },
    languages: { type: [String], default: undefined },
    os: { type: String, default: null },
    osvMin: { type: String, default: null },
    makes: { type: [String], default: undefined },
    carriers: { type: [String], default: undefined },
    connectionTypes: { type: [Number], default: undefined },
    deviceTypes: { type: [Number], default: undefined },
  },
  { _id: false }
);

// One audience segment line items can target. The whole platform shares one
// catalog (managed by the super admin), so segments carry no org.
const segmentSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // "in.26" | "iab4.243"
    source: { type: String, required: true }, // catalog | iab
    country: { type: String, default: null }, // catalog: ISO-2
    number: { type: Number, default: null }, // catalog: the workbook's #
    name: { type: String, required: true },
    category: { type: String, default: null },
    subCategory: { type: String, default: null },
    path: { type: String, default: null }, // iab: "Interest | Automotive | Auto Parts"
    definition: { type: String, default: null },
    signalType: { type: String, default: null },
    verticals: { type: String, default: null },
    route: { type: String, required: true }, // request | app_usage | modeled | exchange
    status: { type: String, required: true }, // live | needs_data | not_offered
    reason: { type: String, default: null }, // why it isn't live
    note: { type: String, default: null }, // how a live segment is decided, when the name overstates it
    reachPct: { type: Number, default: null }, // share of the addressable base
    reachMn: { type: Number, default: null }, // estimated monthly devices, millions
    scaleTier: { type: String, default: null }, // Mass | Large | Mid | Niche
    rule: { type: ruleSchema, default: null }, // request route
    segtax: { type: Number, default: null }, // iab: 4
    segId: { type: String, default: null }, // iab: the id exchanges send
    ancestors: { type: [String], default: undefined }, // iab: ids of parent branches
    uploadId: { type: String, default: null },
  },
  { timestamps: true }
);

segmentSchema.index({ source: 1, country: 1, number: 1 });
segmentSchema.index({ source: 1, status: 1, category: 1 });
segmentSchema.index({ ancestors: 1 }); // bid engine: a branch's descendants

// One upload of the segment workbook.
const segmentUploadSchema = new mongoose.Schema(
  {
    country: { type: String, required: true },
    fileName: { type: String, default: null },
    baseMn: { type: Number, default: null },
    segments: { type: Number, default: 0 },
    live: { type: Number, default: 0 },
    uploadedBy: { type: String, default: null },
  },
  { timestamps: true }
);

segmentUploadSchema.index({ country: 1, createdAt: -1 });

module.exports = {
  segmentModel: mongoose.models.segmentModel || mongoose.model("segmentModel", segmentSchema),
  segmentUploadModel:
    mongoose.models.segmentUploadModel || mongoose.model("segmentUploadModel", segmentUploadSchema),
};
