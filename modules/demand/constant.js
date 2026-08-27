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

  TRAFFIC_TYPE: {
    APP: "app",
    SITE: "site",
    ALL: "all",
  },
};
