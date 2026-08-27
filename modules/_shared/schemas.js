const mongoose = require("mongoose"),
  Schema = mongoose.Schema;

const { AUTH_TYPE, DEAL_MODEL, DEAL_TYPE, AUCTION_TYPE, DEFAULT_CURRENCY } = require("./constant");

// A geo-scoped endpoint. A partner can have several endpoints, each serving a
// set of countries — the "add endpoint geo-wise" feature. At call time the
// engine picks the endpoint whose `geos` match the request country; an
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

// Plain nested-object auth block (not a sub-schema, so it stays a flat object
// in the parent document — matches the original demand model shape).
const authFields = {
  type: { type: String, default: AUTH_TYPE.NONE },
  headerName: { type: String, default: null },
  value: { type: String, default: null }, // token / key (store encrypted in prod)
};

// The partner's commercial arrangement with us — revshare OR margin.
const dealFields = {
  model: { type: String, default: DEAL_MODEL.MARGIN },
  revSharePct: { type: Number, default: null }, // model=revshare: % of revenue WE keep
  marginPct: { type: Number, default: 0 }, // model=margin: cut on eCPM (P × (1−m))
  minMarginCpm: { type: Number, default: null }, // absolute floor on margin
  bidAdjustPct: { type: Number, default: 0 }, // trust/discount partner bids (±%)
};

// An OpenRTB PMP deal negotiated offline with a partner. Travels on the wire
// as imp.pmp.deals[] (request) ↔ bid.dealid (response). Deal bids bypass
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

module.exports = { endpointSchema, authFields, dealFields, dealTermSchema };
