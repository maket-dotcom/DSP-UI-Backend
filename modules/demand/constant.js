module.exports = {
  STATUS: {
    ACTIVE: "active",
    PAUSED: "paused",
    DELETED: "deleted",
  },

  // What kind of partner this is (label from the architecture; also hints at
  // money direction). Purely descriptive — the mechanism is the same.
  PARTNER_KIND: {
    DSP: "dsp", // external demand-side platform we call for bids
    SSP: "ssp", // another supply platform we resell our supply to (for a cut)
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

  DEFAULT_CURRENCY: "USD",
};
