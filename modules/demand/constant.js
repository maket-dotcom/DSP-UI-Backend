module.exports = {
  STATUS: {
    ACTIVE: "active",
    PAUSED: "paused",
    DELETED: "deleted",
  },

  // Buy-side only — supply-side platforms live in modules/supply.
  KIND: {
    DSP: "dsp", // external demand-side platform we call for bids
    EXCHANGE: "exchange",
    NETWORK: "network",
  },

  // How we integrate with the partner.
  INTEGRATION: {
    RTB: "rtb", // OpenRTB server-to-server bid request/response
    VAST: "vast", // video/CTV VAST tag URL
    PASSBACK: "passback", // client-side redirect / waterfall
    PREBID: "prebid", // prebid-server adapter
    DEAL: "deal", // PMP / private deal
  },

  PROTOCOL: {
    OPENRTB_25: "openrtb-2.5",
    OPENRTB_26: "openrtb-2.6",
  },

  AUTH_TYPE: {
    NONE: "none",
    BEARER: "bearer",
    HEADER: "header",
    QUERY: "query",
  },

  AD_FORMAT: {
    BANNER: "banner",
    VIDEO: "video",
    NATIVE: "native",
  },

  TRAFFIC_TYPE: {
    APP: "app",
    SITE: "site",
    ALL: "all",
  },

  // The commercial arrangement with a partner — how the money is settled.
  //   margin   → cut is taken in the bid price at auction time (P × (1 − marginPct))
  //   revshare → bid passes through unmodified; billing-time split by revSharePct
  //   fixed    → fixed eCPM pricing: every billable impression settles at fixedCpm,
  //              regardless of the bid price on the wire
  DEAL_MODEL: {
    REVSHARE: "revshare",
    MARGIN: "margin",
    FIXED: "fixed",
  },

  // OpenRTB PMP deal types (imp.pmp.deals[] ↔ bid.dealid).
  DEAL_TYPE: {
    PREFERRED: "preferred", // fixed CPM, one buyer, first look
    PRIVATE_AUCTION: "private_auction", // invite-only buyers, negotiated floor
    PROGRAMMATIC_GUARANTEED: "programmatic_guaranteed", // fixed CPM + committed volume
  },

  // OpenRTB `at` on a deal: 1 = first price, 2 = second price, 3 = fixed (deal price).
  AUCTION_TYPE: {
    FIRST_PRICE: 1,
    SECOND_PRICE: 2,
    FIXED: 3,
  },

  DEFAULT_CURRENCY: "USD",
};
