const mongoose = require("mongoose"),
  Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

const {
  STATUS,
  KIND,
  FLOW,
  AUTH_TYPE,
  DEAL_MODEL,
  DEAL_TYPE,
  AUCTION_TYPE,
  DEFAULT_CURRENCY,
} = require("./constant");

// A geo-scoped endpoint we push supply to. At call time the engine picks the
// endpoint whose `geos` match the request country; an endpoint with an empty
// `geos` is the default (all geos).
const endpointSchema = new Schema(
  {
    label: { type: String, default: null }, // e.g. "US-East", "APAC"
    url: { type: String, required: true }, // https://partner/rtb
    geos: { type: [String], default: [] }, // ISO country codes; [] = all
    tmaxMs: { type: Number, default: 200 }, // think-time we grant this endpoint
    priority: { type: Number, default: 0 }, // tie-break / waterfall order
    qps: { type: Number, default: null }, // per-endpoint throttle (null = uncapped)
  },
  { _id: false }
);

// An OpenRTB PMP deal arranged with this supply. Travels on the wire as
// imp.pmp.deals[] (request) ↔ bid.dealid (response). Deal bids bypass
// open-auction floors and can carry their own margin.
const dealTermSchema = new Schema(
  {
    dealId: { type: String, required: true }, // the token on the wire
    name: { type: String, default: null },
    type: { type: String, default: DEAL_TYPE.PRIVATE_AUCTION },
    status: { type: String, default: "active" },
    auctionType: { type: Number, default: AUCTION_TYPE.SECOND_PRICE }, // OpenRTB `at`
    fixedCpm: { type: Number, default: null }, // preferred / PG
    floorCpm: { type: Number, default: null }, // private auction
    currency: { type: String, default: DEFAULT_CURRENCY },
    wseat: { type: [String], default: [] }, // whitelisted buyer seats
    marginPctOverride: { type: Number, default: null }, // deal-specific cut ≠ partner default
    targeting: {
      geos: { type: [String], default: [] },
      adFormats: { type: [String], default: [] },
    },
    startDate: { type: Date, default: null }, // PG deals are usually time-bound
    endDate: { type: Date, default: null },
    volumeGoal: { type: Number, default: null }, // PG: committed impressions (informational)
  },
  { _id: false }
);

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
    // We call them: geo-wise endpoints + auth.
    outbound: {
      endpoints: { type: [endpointSchema], default: [] },
      auth: {
        type: { type: String, default: AUTH_TYPE.NONE },
        headerName: { type: String, default: null },
        value: { type: String, default: null }, // token / key (store encrypted in prod)
      },
    },

    // --- The deal: the split — revshare, margin on eCPM, or fixed eCPM ---
    deal: {
      model: { type: String, default: DEAL_MODEL.MARGIN },
      revSharePct: { type: Number, default: null }, // model=revshare: % of revenue WE keep
      marginPct: { type: Number, default: 0 }, // model=margin: cut on eCPM (P × (1−m))
      fixedCpm: { type: Number, default: null }, // model=fixed: every impression settles at this eCPM
      minMarginCpm: { type: Number, default: null }, // absolute floor on margin
      bidAdjustPct: { type: Number, default: 0 }, // trust/discount partner bids (±%)
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
