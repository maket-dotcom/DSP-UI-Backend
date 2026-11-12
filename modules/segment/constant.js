module.exports = {
  // Where a segment comes from: our own catalog (the audience segment workbook)
  // or the IAB Audience Taxonomy 1.1 that exchanges send in user.data
  // (Seller Defined Audiences).
  SOURCE: {
    CATALOG: "catalog",
    IAB: "iab",
  },

  // live        = can be targeted; the bid engine decides membership.
  // needs_data  = in the catalog, but we have no way yet to tell who is in it.
  // not_offered = left out on purpose (sensitive, or likely to reach children).
  STATUS: {
    LIVE: "live",
    NEEDS_DATA: "needs_data",
    NOT_OFFERED: "not_offered",
  },

  // How a device qualifies.
  //   request   = read live from the bid request (geo, language, device, carrier)
  //   app_usage = needs a history of the apps the device was seen in
  //   modeled   = needs a model or a data partner (age, gender, household)
  //   exchange  = the exchange says so in user.data (IAB segtax 4)
  ROUTE: {
    REQUEST: "request",
    APP_USAGE: "app_usage",
    MODELED: "modeled",
    EXCHANGE: "exchange",
  },

  // Workbook categories per route; any other category is app usage.
  REQUEST_CATEGORIES: ["Geography", "Language", "Device & OS", "Telecom & Connectivity"],
  MODELED_CATEGORIES: ["Demographics", "Life Stage & Household"],

  // OpenRTB user.data[].ext.segtax for IAB Audience Taxonomy 1.1.
  IAB_SEGTAX: 4,

  // Monthly addressable devices the workbook's reach % is applied to, when the
  // workbook doesn't say (its Assumptions sheet, cell B4).
  DEFAULT_BASE_MN: 500,

  DEFAULT_COUNTRY: "IN",

  // Segment keys saved on line items: "<country>.<workbook #>" for the catalog
  // ("in.26"), "iab4.<IAB id>" for exchange segments ("iab4.243").
  KEY_PATTERN: /^([a-z]{2}\.\d{1,5}|iab4\.\d{1,6})$/,

  // Most segments one line item may include or exclude.
  MAX_PER_SIDE: 50,
};
