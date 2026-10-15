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

  // Keeps one list inside the 5 MB request body limit.
  MAX_VALUES: 50000,
};
