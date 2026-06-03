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
    WEB: 'web'
  },
  MOBILE_GOALS: {
    INSTALL: 'install',
    ENGAGEMENT: 'engagement',
    RETARGETIN: 'retargeting',
  },
  WEB_GOALS: {

  },
  CTV_GOALS: {

  },

  AUDIENCE_TARGET: {
    ALL: 'all',
    CUSTOM: 'custom',
  },

  INVENTORY_TYPE: {
    PROGRAMMATIC: 'programmatic',
    OEM_PREMIUM_PARTNERS: 'oem_premium_partners',
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
    goal: "Goal",
    budget: "Budget",
    dailyBudget: "Daily Budget",
  }

};
