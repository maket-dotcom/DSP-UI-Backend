const { AUDIENCE_TARGET, INVENTORY_TYPE, FREQ_UNIT } = require("../campaign/constant");

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

  // Environment: in-app (request has `app`) or mobile web (`site`).
  CHANNEL: {
    APP: "app",
    WEB: "web",
  },

  // Retargeting audiences the engine keeps per campaign (Redis, keyed by ad id).
  SEGMENT: {
    CLICKERS: "clickers",
    VIEWERS: "viewers",
    ANY: "any", // clicked or saw
  },

  // OpenRTB 2.5 device.devicetype.
  DEVICE_TYPE: {
    1: "Mobile / tablet",
    2: "Personal computer",
    3: "Connected TV",
    4: "Phone",
    5: "Tablet",
    6: "Connected device",
    7: "Set-top box",
  },

  // OpenRTB 2.5 device.connectiontype.
  CONNECTION_TYPE: {
    0: "Unknown",
    1: "Ethernet",
    2: "Wi-Fi",
    3: "Cellular (unknown generation)",
    4: "2G",
    5: "3G",
    6: "4G",
    7: "5G",
  },

  MAX_FLIGHTS: 20,

  // Inline entries per rule; bigger sets belong in a targeting list.
  MAX_INLINE_VALUES: 5000,

  AUDIENCE_TARGET,
  INVENTORY_TYPE,
  FREQ_UNIT,
};
