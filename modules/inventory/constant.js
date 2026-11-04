module.exports = {
  // What an inventory row is keyed by: an app bundle / site domain (can be
  // targeted) or an app / site name (reference only: targeting matches bundles).
  KIND: {
    BUNDLE: "bundle",
    NAME: "name",
  },

  DEFAULT_COUNTRY: "IN",

  // Placeholder keys exchanges report when they don't know the app.
  JUNK_KEYS: ["", "not available", "unknown", "n/a", "na", "-", "(not set)"],

  // OEM and premium partners a line item can be planned against. Saved on the
  // line item (targeting.exchange.oemPremiumPartners) for planning and IOs;
  // the bid engine doesn't use them.
  PARTNERS: {
    oems: [
      "Xiaomi",
      "Samsung",
      "OPPO",
      "vivo",
      "realme",
      "OnePlus",
      "Transsion (itel, Tecno, Infinix)",
      "Motorola",
      "Lava",
      "HMD (Nokia)",
    ],
    dsps: [
      "Moloco",
      "Liftoff",
      "AppLovin",
      "Unity Ads",
      "ironSource",
      "Mintegral",
      "InMobi",
      "Digital Turbine",
      "The Trade Desk",
      "Google DV360",
      "Amazon DSP",
    ],
  },
};
