const mongoose = require("mongoose");
mongoose.Promise = global.Promise;

const { STATUS, KIND, INTEGRATION, PROTOCOL, TRAFFIC_TYPE, DEFAULT_CURRENCY } = require("./constant");
const { endpointSchema, authFields, dealFields, dealTermSchema } = require("../_shared/schemas");

// A Demand Partner is BUY-SIDE only: an external DSP / exchange / network we
// pass the call to for bids. (Supply — where traffic comes from or goes to —
// is a separate model: modules/supply.)
const demandPartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    kind: { type: String, default: KIND.DSP },
    integration: { type: String, default: INTEGRATION.RTB },
    status: { type: String, default: STATUS.PAUSED },

    // --- Geo-wise endpoints (shared endpointSchema) ---
    endpoints: { type: [endpointSchema], default: [] },

    // --- RTB specifics ---
    protocol: { type: String, default: PROTOCOL.OPENRTB_25 },
    auth: authFields,
    seat: { type: String, default: null }, // our seat id at the partner

    // --- The deal: our cut, two models (revshare | margin on eCPM) ---
    deal: dealFields,

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
