module.exports = {
  // Event names tracked in the aggregate-metrics collection (rolled-up daily).
  EVENT_NAME: {
    IMPRESSION: "impression",
    CLICK: "click",
    INSTALL: "install",
    RE_ENGAGEMENT: "re-engagement",
  },

  // "Core" funnel events. Anything NOT in this list is a custom in-app event and
  // is counted under the `events` metric (matches the Dashboard's definition).
  CORE_EVENTS: ["impression", "click", "install", "re-engagement"],

  // Group-by dimensions. The Report is now driven by `aggregatemetricsmodels`
  // (the same source as the Dashboard) instead of a per-event collection, so it
  // supports daily-granularity dimensions only: campaign / publisher / country,
  // plus date / month derived from the stored `date` string (YYYY-MM-DD).
  // (region/city/hour are intentionally NOT supported — the daily rollup carries
  //  no sub-country geo and no timestamp.)
  DIMENSION: {
    CAMPAIGN: "campaign",
    PUBLISHER: "publisher",
    COUNTRY: "country",
    DATE: "date",
    MONTH: "month",
  },

  // Selectable metric columns. spent = Σ impressions × ecpm / 1000 (CPM model);
  // CPI = spent / installs, CPC = spent / clicks (null when denominator is 0).
  METRIC: {
    CLICKS: "clicks",
    INSTALLS: "installs",
    IMPRESSIONS: "impressions",
    EVENTS: "events",
    CTR: "ctr",
    SPENT: "spent",
    CPI: "cpi",
    CPC: "cpc",
  },

  // Default columns shown by the Statistics table.
  DEFAULT_COLUMNS: ["impressions", "clicks", "installs", "ctr", "spent"],

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
