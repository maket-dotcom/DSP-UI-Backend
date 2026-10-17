module.exports = {
  STATUS: {
    ACTIVE: "active",
    DELETED: "deleted",
  },

  // What a list holds, and where line items use it:
  //   bundle → Targeting › App/Site (app bundles / site domains)
  //   zip    → Targeting › Geo (postal codes)
  //   deal   → Targeting › App/Site › Deals (PMP deal ids)
  KIND: {
    BUNDLE: "bundle",
    ZIP: "zip",
    DEAL: "deal",
  },

  // The line item field that references each kind.
  LINE_ITEM_FIELD: {
    bundle: "targeting.inventory.bundleLists",
    zip: "targeting.geo.zipLists",
    deal: "targeting.inventory.dealLists",
  },

  // Who sees an organization list: private = the org only; public = every
  // network too, read-only. A network's own lists are always private to it.
  VISIBILITY: {
    PRIVATE: "private",
    PUBLIC: "public",
  },

  // Keeps one list inside the 5 MB request body limit.
  MAX_VALUES: 50000,
};
