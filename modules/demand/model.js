const mongoose = require("mongoose"),
  Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

const {
  STATUS,
  PARTNER_KIND,
  INTEGRATION,
  PROTOCOL,
  AUTH_TYPE,
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

const demandPartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    partnerKind: { type: String, default: PARTNER_KIND.DSP },
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

    // --- Economics: OUR CUT ---
    revenue: {
      marginPct: { type: Number, default: 0 }, // e.g. 15 → bidToSSP = winPrice * 0.85
      minMarginCpm: { type: Number, default: null }, // absolute floor on margin
      bidAdjustPct: { type: Number, default: 0 }, // trust/discount partner bids (±%)
    },

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
