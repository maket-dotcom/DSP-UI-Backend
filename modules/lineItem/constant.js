const { AUDIENCE_TARGET, INVENTORY_TYPE } = require("../campaign/constant");

module.exports = {
  STATUS: {
    ACTIVE: "active",
    PAUSED: "paused",
    DELETED: "deleted",
  },

  // What the line item buys. A CTV campaign's line items are video; mobile and
  // web campaigns' line items are banner (native comes later).
  FORMAT: {
    BANNER: "banner",
    VIDEO: "video",
  },

  // inherit   → the campaign's price (Bid Configuration → event price → default)
  // fixed_cpm → this line item's own CPM
  BIDDING_STRATEGY: {
    INHERIT: "inherit",
    FIXED_CPM: "fixed_cpm",
  },

  // asap → spend the daily budget as fast as traffic allows
  // even → spread it across the day
  PACING: {
    ASAP: "asap",
    EVEN: "even",
  },

  AUDIENCE_TARGET,
  INVENTORY_TYPE,
};
