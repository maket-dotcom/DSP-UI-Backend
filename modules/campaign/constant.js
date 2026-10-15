const { TYPE } = require("../user/constant");

module.exports = {
  STATUS: {
    ACTIVE: "active",
    PAUSED: "paused",
    DELETED: "deleted",
  },
  USER_TYPE: TYPE,
  TYPE: {
    MOBILE: 'mobile',
    CTV: 'ctv',
    WEB: 'web',
  },
  MOBILE_GOALS: {
    INSTALL: 'install',
    ENGAGEMENT: 'engagement',
    RETARGETIN: 'retargeting',
  },
  WEB_GOALS: {

  },
  CTV_GOALS: {
    AWARENESS: 'awareness',
    COMPLETED_VIEWS: 'completed_views',
  },

  // What the campaign budget (and its line items' budgets) count.
  BUDGET_TYPE: {
    SPEND: "spend",
    IMPRESSIONS: "impressions",
  },

  // Frequency cap window units: "3 impressions every 1 day per user".
  FREQ_UNIT: {
    HOUR: "hour",
    DAY: "day",
    WEEK: "week",
  },

  AUDIENCE_TARGET: {
    ALL: 'all',
    CUSTOM: 'custom',
  },

  INVENTORY_TYPE: {
    PROGRAMMATIC: 'programmatic',
    OEM_PREMIUM_PARTNERS: 'oem_premium_partners',
  },

  APP_PLATFORM: {
    IOS: "ios",
    ANDROID: "android",
  },

  MMP: {
    APPSFLYER: "appsflyer",
    ADJUST: "adjust",
    BRANCH: "branch",
    SINGULAR: "singular",
    APPTROVE: "apptrove",
    KOCHAWA: "kochawa",
    APPMETRICA: "appmetrica",
    AFFISE: "affise",
  },

  DATA_MAPPING: {
    title: "Title",
    advertiserName: "Advertiser",
    status: "Status",
    goal: "Goal",
    budget: "Budget",
    dailyBudget: "Daily Budget",
    lineItems: "Line Items", // geo now lives on line items
    mcpEnabled: "MCP",
  }

};
