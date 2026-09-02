module.exports = {
  STATUS: {
    ACTIVE: "active",
    PAUSED: "paused",
    DELETED: "deleted",
  },

  // Who the supply partner is.
  KIND: {
    SSP: "ssp",
    NETWORK: "network",
    PUBLISHER: "publisher",
    EXCHANGE: "exchange",
  },

  // Direction of traffic — one generic model covers both.
  //   inbound  → they call our /rtb?zone=<zoneId>
  //   outbound → we push our supply to their endpoints
  FLOW: {
    INBOUND: "inbound",
    OUTBOUND: "outbound",
    BOTH: "both",
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
