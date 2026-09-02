const mongoose = require("mongoose"),
  Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

const {
  STATUS,
  KIND,
  INTEGRATION,
  PROTOCOL,
  AUTH_TYPE,
  DEAL_MODEL,
  DEAL_TYPE,
  AUCTION_TYPE,
  TRAFFIC_TYPE,
  DEFAULT_CURRENCY,
} = require("./constant");

// A geo-scoped endpoint. A partner can have several endpoints, each serving a
// set of countries — this is the "add endpoint geo-wise" feature. At bid time
// the engine picks the endpoint whose `geos` match the request country; an
// endpoint with an empty `geos` is the default (all geos).
const endpointSchema = new Schema(
  {
    label: { type: String, default: null }, // e.g. "US-East", "APAC"
    url: { type: String, required: true }, // https://partner/rtb  (or VAST tag URL)
    geos: { type: [String], default: [] }, // ISO country codes; [] = all
    tmaxMs: { type: Number, default: 200 }, // think-time we grant this endpoint
    priority: { type: Number, default: 0 }, // tie-break / waterfall order
    qps: { type: Number, default: null }, // per-endpoint throttle (null = uncapped)
  },
  { _id: false }
);

// An OpenRTB PMP deal negotiated offline with this partner. Travels on the
// wire as imp.pmp.deals[] (request) ↔ bid.dealid (response). Deal bids bypass
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

// A Demand Partner is BUY-SIDE only: an external DSP / exchange / network we
// pass the call to for bids. (Supply — where traffic comes from or goes to —
// is a separate model: modules/supply.)
const demandPartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    kind: { type: String, default: KIND.DSP },
    integration: { type: String, default: INTEGRATION.RTB },
    status: { type: String, default: STATUS.PAUSED },

    // --- Geo-wise endpoints ---
    endpoints: { type: [endpointSchema], default: [] },

    // --- RTB specifics ---
    protocol: { type: String, default: PROTOCOL.OPENRTB_25 },
    auth: {
      type: { type: String, default: AUTH_TYPE.NONE },
      headerName: { type: String, default: null },
      value: { type: String, default: null }, // token / key (store encrypted in prod)
    },
    seat: { type: String, default: null }, // our seat id at the partner

    // --- The deal: our cut — revshare, margin on eCPM, or fixed eCPM ---
    deal: {
      model: { type: String, default: DEAL_MODEL.MARGIN },
      revSharePct: { type: Number, default: null }, // model=revshare: % of revenue WE keep
      marginPct: { type: Number, default: 0 }, // model=margin: cut on eCPM (P × (1−m))
      fixedCpm: { type: Number, default: null }, // model=fixed: every impression settles at this eCPM
      minMarginCpm: { type: Number, default: null }, // absolute floor on margin
      bidAdjustPct: { type: Number, default: 0 }, // trust/discount partner bids (±%)
    },

    // --- PMP deals negotiated with this partner (injected as imp.pmp.deals) ---
    deals: { type: [dealTermSchema], default: [] },

    // --- Targeting: which of our supply to send this partner ---
    targeting: {
      geos: { type: [String], default: [] }, // country allowlist ([] = all)
      adFormats: { type: [String], default: [] }, // banner/video/native ([] = all)
      deviceTypes: { type: [Number], default: [] }, // OpenRTB devicetypes (3/7 = CTV)
      os: { type: [String], default: [] },
      trafficType: { type: String, default: TRAFFIC_TYPE.ALL },
      bundlesAllow: { type: [String], default: [] },
      bundlesBlock: { type: [String], default: [] },
      categoriesBlock: { type: [String], default: [] },
    },

    // --- Ops / safety ---
    limits: {
      qps: { type: Number, default: null },
      dailyReqCap: { type: Number, default: null },
      dailySpendCap: { type: Number, default: null },
      timeoutMs: { type: Number, default: 200 }, // hard per-call timeout
    },
    sampling: {
      trafficPct: { type: Number, default: 100 }, // ramp: send only X% while testing
    },
    currency: { type: String, default: DEFAULT_CURRENCY },
    notifyWinUrl: { type: Boolean, default: true }, // fire partner nurl on win

    // Audit (super-admin userId).
    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

// Common lookups: active partners for a geo, and the super-admin list.
demandPartnerSchema.index({ status: 1 });
demandPartnerSchema.index({ status: 1, "targeting.geos": 1 });

module.exports =
  mongoose.models.demandPartnerModel ||
  mongoose.model("demandPartnerModel", demandPartnerSchema);
