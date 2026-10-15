const Joi = require("joi");
const {
  STATUS,
  FORMAT,
  BIDDING_STRATEGY,
  PACING,
  AUDIENCE_TARGET,
  INVENTORY_TYPE,
  FREQ_UNIT,
  CHANNEL,
  SEGMENT,
  DEVICE_TYPE,
  CONNECTION_TYPE,
  MAX_FLIGHTS,
  MAX_INLINE_VALUES,
} = require("./constant");

const objectId = Joi.string().trim().pattern(/^[a-fA-F0-9]{24}$/).messages({
  "string.pattern.base": "{{#label}} must be a valid id",
});
const money = Joi.number().min(0).allow(null);

const bidding = Joi.object({
  strategy: Joi.string().valid(...Object.values(BIDDING_STRATEGY)).required(),
  cpm: Joi.number().greater(0).allow(null).optional(),
  maxCpm: Joi.number().greater(0).allow(null).optional(),
}).custom((v, helpers) => {
  if (v.strategy === BIDDING_STRATEGY.FIXED_CPM && !(v.cpm > 0)) {
    return helpers.message("Enter a CPM bid greater than 0, or choose 'Use campaign bid'");
  }
  if (v.cpm > 0 && v.maxCpm > 0 && v.cpm > v.maxCpm) {
    return helpers.message("CPM bid can't be higher than the max CPM");
  }
  return v;
});

// { include: [], exclude: [] }. A value can't be both included and excluded.
const includeExclude = (item, label) =>
  Joi.object({
    include: Joi.array().items(item).max(MAX_INLINE_VALUES).unique().default([]),
    exclude: Joi.array().items(item).max(MAX_INLINE_VALUES).unique().default([]),
  })
    .custom((v, helpers) => {
      const ex = new Set(v.exclude.map(String));
      const both = v.include.find((x) => ex.has(String(x)));
      if (both !== undefined) return helpers.message(`${label} "${both}" is both included and excluded`);
      return v;
    })
    .default({});

const bundle = Joi.string().trim().lowercase().max(255);
const iabCode = Joi.string().trim().uppercase().pattern(/^IAB\d{1,2}(-\d{1,3})?$/).messages({
  "string.pattern.base": "{{#value}} isn't an IAB category code (e.g. IAB9 or IAB9-30)",
});
const language = Joi.string().trim().lowercase().pattern(/^[a-z]{2}$/).messages({
  "string.pattern.base": "{{#value}} isn't a 2-letter language code (e.g. en)",
});
const deviceType = Joi.number().integer().valid(...Object.keys(DEVICE_TYPE).map(Number));
const zoneId = Joi.string().trim().pattern(/^[a-zA-Z0-9_-]+$/).max(100);
const connectionType = Joi.number().integer().valid(...Object.keys(CONNECTION_TYPE).map(Number));
const lowerText = Joi.string().trim().lowercase().max(100);
const metro = Joi.string().trim().lowercase().max(20);
// Postal codes as the engine compares them: lower-cased, no spaces.
const zip = Joi.string().trim().lowercase().max(20).custom((v) => v.replace(/\s+/g, ""));
const dealId = Joi.string().trim().max(100);
const osVersion = Joi.string().trim().pattern(/^\d{1,4}(\.\d{1,4}){0,2}$/).allow("", null).messages({
  "string.pattern.base": "OS version must look like 10, 13.4 or 14.2.1",
});

const validTimezone = (tz, helpers) => {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch (e) {
    return helpers.message(`Unknown timezone "${tz}"`);
  }
};

const segmentRef = Joi.object({
  campaignId: objectId.allow("", null).default(null), // null = this campaign
  segment: Joi.string().valid(...Object.values(SEGMENT)).default(SEGMENT.ANY),
});

const frequencyCaps = Joi.array()
  .items(
    Joi.object({
      count: Joi.number().integer().min(1).max(1000).required(),
      every: Joi.number().integer().min(1).max(365).required(),
      unit: Joi.string().valid(...Object.values(FREQ_UNIT)).required(),
    })
  )
  .max(5);

const versionParts = (v) => String(v).split(".").map(Number);
const versionBefore = (a, b) => {
  const x = versionParts(a);
  const y = versionParts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) < (y[i] || 0);
  }
  return false;
};

const targeting = Joi.object({
  geo: Joi.object({
    countries: Joi.object({
      // "ALL" is the UI's "Global (All)" option: the same as no country limit.
      include: Joi.array()
        .items(Joi.string().trim().uppercase())
        .default([])
        .custom((v) => (v.includes("ALL") ? [] : v)),
      exclude: Joi.array()
        .items(Joi.string().trim().uppercase())
        .default([])
        .custom((v) => v.filter((c) => c !== "ALL")),
    }).default({}),
    custom: Joi.array()
      .items(
        Joi.object({
          country: Joi.string().trim().allow("", null).optional(),
          state: Joi.string().trim().allow("", null).optional(),
          city: Joi.string().trim().allow("", null).optional(),
        })
      )
      .default([]),
    metros: includeExclude(metro, "Metro"),
    zips: includeExclude(zip, "ZIP"),
    zipLists: includeExclude(objectId, "List"),
  }).default({}),
  inventory: Joi.object({
    bundles: includeExclude(bundle, "Bundle"),
    bundleLists: includeExclude(objectId, "List"),
    deals: includeExclude(dealId, "Deal"),
    dealLists: includeExclude(objectId, "List"),
  }).default({}),
  content: Joi.object({
    categories: includeExclude(iabCode, "Category"),
    languages: includeExclude(language, "Language"),
  }).default({}),
  environment: Joi.object({
    channels: Joi.array().items(Joi.string().valid(...Object.values(CHANNEL))).unique().default([]),
  }).default({}),
  platform: Joi.object({
    deviceTypes: includeExclude(deviceType, "Device type"),
    connectionTypes: includeExclude(connectionType, "Connection type"),
    makes: includeExclude(lowerText, "Make"),
    models: includeExclude(lowerText, "Model"),
    carriers: includeExclude(lowerText, "Carrier"),
    osVersion: Joi.object({
      min: osVersion.default(null),
      max: osVersion.default(null),
    })
      .custom((v, helpers) =>
        v.min && v.max && versionBefore(v.max, v.min)
          ? helpers.message("Max OS version is lower than the min OS version")
          : v
      )
      .default({}),
  }).default({}),
  time: Joi.object({
    timezone: Joi.string().trim().allow("", null).custom(validTimezone).default(null),
    slots: Joi.array().items(Joi.number().integer().min(0).max(167)).unique().default([]),
  }).default({}),
  segments: Joi.object({
    audienceTarget: Joi.string().valid(...Object.values(AUDIENCE_TARGET)).default("all"),
    customAudienceIds: Joi.array().items(Joi.string().trim()).default([]),
    retargeting: Joi.object({
      include: Joi.array().items(segmentRef).max(20).default([]),
      exclude: Joi.array().items(segmentRef).max(20).default([]),
    }).default({}),
    requireDeviceId: Joi.boolean().default(false),
  }).default({}),
  exchange: Joi.object({
    inventoryType: Joi.string().valid(...Object.values(INVENTORY_TYPE)).default("programmatic"),
    oemPremiumPartners: Joi.array().items(Joi.string().trim()).default([]),
    supplyPartners: includeExclude(objectId, "Supply partner"),
    zones: includeExclude(zoneId, "Zone"),
  }).default({}),
});

// Bursts inside the line item's run, each with an optional budget.
const flights = Joi.array()
  .items(
    Joi.object({
      startDate: Joi.date().required(),
      endDate: Joi.date().required(),
      budget: Joi.number().greater(0).allow(null).default(null),
    }).custom((f, helpers) => (f.endDate < f.startDate ? helpers.message("A flight ends before it starts") : f))
  )
  .max(MAX_FLIGHTS)
  .custom((rows, helpers) => {
    const sorted = [...rows].sort((a, b) => a.startDate - b.startDate);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].startDate <= sorted[i - 1].endDate) return helpers.message("Flights can't overlap");
    }
    return sorted;
  });

const fields = {
  name: Joi.string().trim().max(200),
  format: Joi.string().valid(...Object.values(FORMAT)),
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED),
  alternativeId: Joi.string().trim().allow("", null),
  notes: Joi.string().trim().max(2000).allow("", null),
  startDate: Joi.date().allow(null),
  endDate: Joi.date().allow(null),
  budget: money,
  dailyBudget: money,
  pacing: Joi.string().valid(...Object.values(PACING)),
  frequencyCaps: frequencyCaps,
  flights: flights,
  bidModifierId: objectId.allow(null, ""),
  deliveryModifierId: objectId.allow(null, ""),
  bidding: bidding,
  targeting: targeting,
  creatives: Joi.array()
    .items(
      Joi.object({
        creativeId: objectId.required(),
        weight: Joi.number().integer().min(1).max(100).default(1),
      })
    )
    .unique("creativeId"),
};

const create = Joi.object({
  ...fields,
  campaignId: objectId.required(),
  name: fields.name.required(),
  format: fields.format.required(),
  status: fields.status.default(STATUS.PAUSED),
  pacing: fields.pacing.default(PACING.ASAP),
  frequencyCaps: frequencyCaps.default([]),
  flights: flights.default([]),
  bidModifierId: objectId.allow(null, "").default(null),
  deliveryModifierId: objectId.allow(null, "").default(null),
  bidding: bidding.required(),
  targeting: targeting.default({}),
  creatives: fields.creatives.default([]),
});

const update = Joi.object(fields).min(1);

const changeStatus = Joi.object({
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED).required(),
});

const list = Joi.object({
  campaignId: objectId.required(),
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED).optional(),
});

// Shared with presets (a line item preset is these settings without dates,
// budgets or creatives).
module.exports = { create, update, changeStatus, list, targeting, frequencyCaps, bidding, PACING };
