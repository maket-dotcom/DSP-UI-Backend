module.exports = {
  STATUS: {
    ACTIVE: "active",
    DELETED: "deleted",
  },

  // Request attributes a term's condition can test. Keep in sync with the bid
  // engine's internal/modifier fields. `hint` is shown in the UI.
  FIELD: {
    bundle: { label: "App bundle / domain", hint: "com.example.app or news.example.com" },
    country: { label: "Country", hint: "ISO code, e.g. IN or USA" },
    region: { label: "Region / state", hint: "As sent by the exchange, e.g. MH" },
    city: { label: "City", hint: "e.g. Mumbai" },
    metro: { label: "Metro (DMA)", hint: "e.g. 501" },
    zip: { label: "ZIP / postal code", hint: "e.g. 400001" },
    zone: { label: "Zone", hint: "Zone id" },
    supply_partner: { label: "Supply partner", hint: "Supply partner id" },
    device_type: { label: "Device type", hint: "OpenRTB devicetype 1–7" },
    os: { label: "Operating system", hint: "android, ios" },
    make: { label: "Device make", hint: "e.g. samsung" },
    model: { label: "Device model", hint: "e.g. sm-a515f" },
    carrier: { label: "Carrier", hint: "e.g. jio" },
    connection_type: { label: "Connection type", hint: "OpenRTB connectiontype 0–7" },
    language: { label: "Language", hint: "2-letter code, e.g. en" },
    category: { label: "IAB category", hint: "e.g. IAB9 (covers IAB9-*)" },
    environment: { label: "Environment", hint: "app or web" },
    ad_size: { label: "Ad size", hint: "e.g. 320x50" },
    hour: { label: "Hour of day", hint: "0–23, line item timezone" },
    weekday: { label: "Day of week", hint: "mon … sun, line item timezone" },
    deal: { label: "PMP deal", hint: "Deal id" },
  },

  MAX_TERMS: 50,
  MAX_CONDITIONS: 10,
  MAX_VALUES: 1000,
  MAX_MULTIPLIER: 10,
};
