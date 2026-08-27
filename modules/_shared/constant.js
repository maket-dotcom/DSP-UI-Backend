// Constants shared by the mediation-layer modules (demand + supply).
// Partner-specific enums stay in each module's own constant.js.
module.exports = {
  STATUS: {
    ACTIVE: "active",
    PAUSED: "paused",
    DELETED: "deleted",
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

  // The commercial arrangement with a partner — how our cut is taken.
  //   margin   → cut is taken in the bid price at auction time (P × (1 − marginPct))
  //   revshare → bid passes through unmodified; billing-time split by revSharePct
  DEAL_MODEL: {
    REVSHARE: "revshare",
    MARGIN: "margin",
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
