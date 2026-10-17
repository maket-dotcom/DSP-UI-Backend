module.exports = {
  STATUS: {
    ACTIVE: "active",
    DELETED: "deleted",
  },

  // What a preset prefills:
  //   campaign  → goal, KPI, currency, budgets, frequency caps, MMP, events
  //   lineItem  → pacing, bidding, frequency caps and the full targeting
  //   targeting → the targeting tabs only
  KIND: {
    CAMPAIGN: "campaign",
    LINE_ITEM: "lineItem",
    TARGETING: "targeting",
  },

  // Who sees an organization preset: private = the org only; public = every
  // network too, read-only. A network's own presets are always private to it.
  VISIBILITY: {
    PRIVATE: "private",
    PUBLIC: "public",
  },

  // Advertiser default that points at each kind.
  ADVERTISER_DEFAULT: {
    campaign: "defaults.campaignPresetId",
    lineItem: "defaults.lineItemPresetId",
    targeting: "defaults.targetingPresetId",
  },
};
