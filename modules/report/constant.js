module.exports = {
  // Event names tracked in the report collection (one document per event).
  EVENT_NAME: {
    IMPRESSION: "impression",
    CLICK: "click",
    INSTALL: "install",
  },

  // Group-by dimensions backed by the current report schema.
  // (campaign/publisher/country/region/city are stored fields; date/month/hour
  //  are derived from createdAt.)
  DIMENSION: {
    CAMPAIGN: "campaign",
    PUBLISHER: "publisher",
    COUNTRY: "country",
    REGION: "region",
    CITY: "city",
    DATE: "date",
    MONTH: "month",
    HOUR: "hour",
  },

  // Selectable metric columns.
  METRIC: {
    CLICKS: "clicks",
    INSTALLS: "installs",
    IMPRESSIONS: "impressions",
    CTR: "ctr",
    SPENT: "spent",
  },

  // Default columns shown by the Statistics table.
  DEFAULT_COLUMNS: ["clicks", "installs", "ctr", "spent"],

  // Relative date-range presets (Custom Range = explicit startDate + endDate).
  DATE_PRESET: {
    TODAY: "today",
    YESTERDAY: "yesterday",
    LAST_7_DAYS: "last_7_days",
    LAST_30_DAYS: "last_30_days",
    THIS_MONTH: "this_month",
    LAST_MONTH: "last_month",
  },
};
