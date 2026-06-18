module.exports = {
  // Well-known event names tracked in the aggregate metrics collection.
  EVENT_NAME: {
    IMPRESSION: "impression",
    CLICK: "click",
    INSTALL: "install",
    RE_ENGAGEMENT: "re-engagement",
  },

  // "Core" funnel events. Anything NOT in this list is treated as a custom
  // in-app "event" (e.g. purchase, registration) for the dashboard's Events card.
  CORE_EVENTS: ["impression", "click", "install", "re-engagement"],

  // Metrics that can be plotted / aggregated on the dashboard.
  METRIC: {
    SPENT: "spent",
    INSTALL: "install",
    CLICK: "click",
    IMPRESSION: "impression",
    EVENTS: "events",
    RE_ENGAGEMENT: "re-engagement",
  },

  // Metrics usable as the sort key for the Top Campaigns table.
  TOP_SORTABLE: ["click", "install", "events", "spent", "cpi"],

  // Supported relative date-range presets.
  DATE_PRESET: {
    TODAY: "today",
    YESTERDAY: "yesterday",
    LAST_7_DAYS: "last_7_days",
    LAST_30_DAYS: "last_30_days",
    LAST_90_DAYS: "last_90_days",
  },
};
