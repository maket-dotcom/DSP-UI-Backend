const mongoose = require("mongoose"),
  Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

const { STATUS, KIND, FLOW, DEFAULT_CURRENCY } = require("./constant");
const { endpointSchema, authFields, dealFields, dealTermSchema } = require("../_shared/schemas");

// A zone is the unit of supply — what appears in the engine's `?zone=` query
// param. Today that param is free text with no validation; this config turns
// it into a managed placement: per-zone floor, formats, sizes, status.
// zoneId must be unique ACROSS partners (enforced in the service).
const zoneSchema = new Schema(
  {
    zoneId: { type: String, required: true },
    name: { type: String, default: null },
    status: { type: String, default: STATUS.ACTIVE },
    formats: { type: [String], default: [] }, // banner/video/native ([] = all)
    sizes: { type: [String], default: [] }, // "300x250", "1920x1080" ([] = all)
    deviceTypes: { type: [Number], default: [] }, // OpenRTB devicetypes ([] = all)
    floorCpm: { type: Number, default: null }, // per-zone floor (overrides deal.floorCpm)
  },
  { _id: false }
);

// A Supply Partner is where traffic comes from or goes to — one generic model
// covering inbound (they call our /rtb?zone=) and outbound (we push supply to
// them). Direction is an attribute (`flow`), not a separate schema.
const supplyPartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    kind: { type: String, default: KIND.SSP },
    status: { type: String, default: STATUS.PAUSED },

    flow: { type: String, default: FLOW.INBOUND },
    // They call us: token they must send to authenticate, inbound throttle.
    inbound: {
      authToken: { type: String, default: null },
      qps: { type: Number, default: null },
    },
    // We call them: geo-wise endpoints + auth (shared sub-schemas).
    outbound: {
      endpoints: { type: [endpointSchema], default: [] },
      auth: authFields,
    },

    // --- The deal: same shape as demand ⇒ same UI card ---
    // margin → cut in price; revshare → % of revenue we keep, rest paid out.
    deal: {
      ...dealFields,
      floorCpm: { type: Number, default: null }, // partner-level default floor
    },

    // --- Zones: what appears in ?zone= ---
    zones: { type: [zoneSchema], default: [] },

    // --- PMP deals arranged with this supply (matched against inbound imp.pmp) ---
    deals: { type: [dealTermSchema], default: [] },

    // --- Supply chain (schain / sellers.json) — reserved for later ---
    supplyChain: {
      sellerId: { type: String, default: null },
      sellerDomain: { type: String, default: null },
      isDirect: { type: Boolean, default: true },
    },

    limits: {
      dailyReqCap: { type: Number, default: null },
    },
    currency: { type: String, default: DEFAULT_CURRENCY },

    // Audit (super-admin userId).
    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

// Hot-path lookup is zone → partner; list is by status.
supplyPartnerSchema.index({ status: 1 });
supplyPartnerSchema.index({ "zones.zoneId": 1 });

module.exports =
  mongoose.models.supplyPartnerModel ||
  mongoose.model("supplyPartnerModel", supplyPartnerSchema);
