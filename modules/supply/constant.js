const {
  STATUS,
  AUTH_TYPE,
  AD_FORMAT,
  DEAL_MODEL,
  DEAL_TYPE,
  AUCTION_TYPE,
  DEFAULT_CURRENCY,
} = require("../_shared/constant");

module.exports = {
  STATUS,
  AUTH_TYPE,
  AD_FORMAT,
  DEAL_MODEL,
  DEAL_TYPE,
  AUCTION_TYPE,
  DEFAULT_CURRENCY,

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
};
