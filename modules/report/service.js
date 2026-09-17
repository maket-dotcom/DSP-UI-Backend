const moment = require("moment-timezone");
// Report is driven by the SAME collection as the Dashboard (single source of
// truth) — the rolled-up daily aggregate, NOT a per-event collection. This keeps
// Report and Dashboard numbers identical and scales to real traffic volumes.
const aggregateMetricsModel = require("../aggregate-metrics/model");
const campaignModel = require("../campaign/model");
const orgModel = require("../organization/model");
const { isUndefinedOrNull } = require("../../utils/validators");
const {
  EVENT_NAME,
  CORE_EVENTS,
  DIMENSION,
  SUPER_DIMENSION,
  DATE_PRESET,
  BUNDLE_SORT,
} = require("./constant");
require("dotenv").config();

/* ------------------------------- helpers ------------------------------- */

const round2 = (n) => Math.round(((n || 0) + Number.EPSILON) * 100) / 100;
const isObjectId = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);

// Resolve the requested period into calendar-day strings (YYYY-MM-DD) used to
// match the aggregate `date` field. The timezone only affects which calendar
// days a relative preset resolves to; the aggregate buckets events by UTC day,
// so day boundaries are UTC-accurate (a known limitation of pre-aggregated data).
const resolveRange = (data = {}) => {
  const tz = data.timezone || "UTC";
  const { preset, startDate, endDate } = data;
  let start;
  let end;

  if (!isUndefinedOrNull(startDate) && !isUndefinedOrNull(endDate)) {
    start = moment.tz(startDate, "YYYY-MM-DD", tz).startOf("day");
    end = moment.tz(endDate, "YYYY-MM-DD", tz).endOf("day");
  } else {
    const now = moment.tz(tz);
    const p = preset || DATE_PRESET.YESTERDAY;
    switch (p) {
      case DATE_PRESET.TODAY:
        start = now.clone().startOf("day");
        end = now.clone().endOf("day");
        break;
      case DATE_PRESET.LAST_7_DAYS:
        start = now.clone().subtract(6, "days").startOf("day");
        end = now.clone().endOf("day");
        break;
      case DATE_PRESET.LAST_30_DAYS:
        start = now.clone().subtract(29, "days").startOf("day");
        end = now.clone().endOf("day");
        break;
      case DATE_PRESET.THIS_MONTH:
        start = now.clone().startOf("month");
        end = now.clone().endOf("day");
        break;
      case DATE_PRESET.LAST_MONTH:
        start = now.clone().subtract(1, "month").startOf("month");
        end = now.clone().subtract(1, "month").endOf("month");
        break;
      case DATE_PRESET.YESTERDAY:
      default:
        start = now.clone().subtract(1, "day").startOf("day");
        end = now.clone().subtract(1, "day").endOf("day");
        break;
    }
  }

  if (start.isAfter(end)) {
    const tmp = start;
    start = end;
    end = tmp;
  }

  return {
    tz,
    startDate: start.format("YYYY-MM-DD"),
    endDate: end.format("YYYY-MM-DD"),
  };
};

// Map a group-by dimension to its aggregation expression. date/month derive from
// the stored `date` string (no $dateToString / timezone needed).
const dimensionExpr = (dim) => {
  switch (dim) {
    case DIMENSION.CAMPAIGN:
      return "$campaignId";
    case DIMENSION.PUBLISHER:
      return "$pubId";
    case DIMENSION.COUNTRY:
      return "$country";
    case DIMENSION.BUNDLE:
      return "$bundleId"; // supply app bundle / site domain
    case SUPER_DIMENSION.ORG:
      return "$orgId";
    case DIMENSION.DATE:
      return "$date"; // already YYYY-MM-DD
    case DIMENSION.MONTH:
      return { $substrBytes: ["$date", 0, 7] }; // YYYY-MM
    default:
      return "$campaignId";
  }
};

/* --------------------------- aggregation atoms -------------------------- */

// bidCount/ecpm are stored as strings; convert safely (bad/empty -> 0).
const numBid = {
  $convert: { input: "$bidCount", to: "double", onError: 0, onNull: 0 },
};
const numEcpm = {
  $convert: { input: "$ecpm", to: "double", onError: 0, onNull: 0 },
};
// Each aggregate row carries a COUNT in bidCount, so a metric is the SUM of
// bidCount over its event rows (not a count of documents).
const countIf = (eventName) => ({
  $cond: [{ $eq: ["$eventName", eventName] }, numBid, 0],
});
// Spend is impression-only (CPM): impressions × ecpm / 1000. click/install/event
// rows never contribute, regardless of their ecpm.
const spentExpr = {
  $cond: [
    { $eq: ["$eventName", EVENT_NAME.IMPRESSION] },
    { $divide: [{ $multiply: [numBid, numEcpm] }, 1000] },
    0,
  ],
};
// Custom in-app events = anything not in the core funnel.
const eventsExpr = { $cond: [{ $in: ["$eventName", CORE_EVENTS] }, 0, numBid] };

const metricAccumulators = {
  impressions: { $sum: countIf(EVENT_NAME.IMPRESSION) },
  clicks: { $sum: countIf(EVENT_NAME.CLICK) },
  installs: { $sum: countIf(EVENT_NAME.INSTALL) },
  events: { $sum: eventsExpr },
  spent: { $sum: spentExpr },
};

// Derived columns, added BEFORE $sort so they're sortable. ctr defaults to 0;
// cpi/cpc are null (rendered "—") when their denominator is 0.
const derivedFields = {
  ctr: {
    $cond: [
      { $gt: ["$impressions", 0] },
      { $multiply: [{ $divide: ["$clicks", "$impressions"] }, 100] },
      0,
    ],
  },
  cpi: {
    $cond: [{ $gt: ["$installs", 0] }, { $divide: ["$spent", "$installs"] }, null],
  },
  cpc: {
    $cond: [{ $gt: ["$clicks", 0] }, { $divide: ["$spent", "$clicks"] }, null],
  },
};

// Final shaping: round metrics for display (cpi/cpc stay null).
const shapeMetrics = (doc = {}) => {
  const spent = round2(doc.spent);
  const clicks = doc.clicks || 0;
  const installs = doc.installs || 0;
  const impressions = doc.impressions || 0;
  return {
    impressions,
    clicks,
    installs,
    events: doc.events || 0,
    spent,
    ctr: round2(impressions > 0 ? (clicks / impressions) * 100 : 0),
    cpi: installs > 0 ? round2(spent / installs) : null,
    cpc: clicks > 0 ? round2(spent / clicks) : null,
  };
};

// Bundle drill-down adds eCPM (spend per 1000 impressions) and install rate
// (installs ÷ clicks) on top of the core metrics.
const shapeBundleMetrics = (doc = {}) => {
  const m = shapeMetrics(doc);
  return {
    ...m,
    cvr: round2(m.clicks > 0 ? (m.installs / m.clicks) * 100 : 0),
    ecpm: m.impressions > 0 ? round2((m.spent / m.impressions) * 1000) : null,
  };
};

// Treat user search text literally inside a RegExp.
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Shared aggregation: group the matched rows by the chosen dimensions, compute
// metrics + derived columns, sort/paginate, and return shaped rows + totals +
// the total group count. Used by BOTH the org-scoped and super-admin reports.
const aggregateGrouped = async ({ match, groupBy, sortBy, sortOrder, page, limit }) => {
  const groupId = {};
  groupBy.forEach((d) => {
    groupId[d] = dimensionExpr(d);
  });

  const skip = (page - 1) * limit;
  const sortDir = sortOrder === "asc" ? 1 : -1;

  const [result] = await aggregateMetricsModel.aggregate([
    { $match: match },
    {
      $facet: {
        rows: [
          { $group: { _id: groupId, ...metricAccumulators } },
          { $addFields: derivedFields },
          { $sort: { [sortBy]: sortDir, _id: 1 } },
          { $skip: skip },
          { $limit: limit },
        ],
        summary: [{ $group: { _id: null, ...metricAccumulators } }],
        groupCount: [{ $group: { _id: groupId } }, { $count: "count" }],
      },
    },
  ]);

  const rawRows = (result && result.rows) || [];
  const summaryDoc = (result && result.summary && result.summary[0]) || {};
  const totalGroups =
    (result && result.groupCount && result.groupCount[0] && result.groupCount[0].count) || 0;

  const rows = rawRows.map((r) => ({
    ...r._id, // dimension values (campaign / bundle / org / country / date …)
    ...shapeMetrics(r),
  }));

  return { rows, totals: shapeMetrics(summaryDoc), totalGroups };
};

// Add campaign title/status to rows grouped by campaign (campaignId → title).
const enrichCampaignTitles = async (rows) => {
  const ids = rows.map((r) => r[DIMENSION.CAMPAIGN]).filter(isObjectId);
  if (!ids.length) return;
  const camps = await campaignModel
    .find({ _id: { $in: ids } })
    .select({ title: 1, status: 1 });
  const map = {};
  camps.forEach((c) => {
    map[String(c._id)] = { title: c.title, status: c.status };
  });
  rows.forEach((r) => {
    const c = map[r[DIMENSION.CAMPAIGN]];
    r.campaignTitle = c ? c.title : null;
    r.campaignStatus = c ? c.status : null;
  });
};

// Add organisation name/subdomain to rows grouped by org (orgId → name).
const enrichOrgNames = async (rows) => {
  const ids = rows.map((r) => r[SUPER_DIMENSION.ORG]).filter(isObjectId);
  if (!ids.length) return;
  const orgs = await orgModel
    .find({ _id: { $in: ids } })
    .select({ name: 1, subdomain: 1 });
  const map = {};
  orgs.forEach((o) => {
    map[String(o._id)] = { name: o.name, subdomain: o.subdomain };
  });
  rows.forEach((r) => {
    const o = map[r[SUPER_DIMENSION.ORG]];
    r.orgName = o ? o.name : null;
    r.orgSubdomain = o ? o.subdomain : null;
  });
};

const buildResponse = (data, range, groupBy, columns, sortBy, sortOrder, page, limit, result) => ({
  groupBy,
  columns,
  sort: { by: sortBy, order: sortOrder },
  range: {
    preset: data.preset || null,
    startDate: range.startDate,
    endDate: range.endDate,
    timezone: range.tz,
  },
  totals: result.totals,
  data: result.rows,
  pagination: {
    page,
    limit,
    total: result.totalGroups,
    totalPages: Math.ceil(result.totalGroups / limit),
  },
});

/* ------------------------------- service ------------------------------- */

const reportService = {
  // Org-scoped statistics report (driven by the caller's token org).
  getReport: async ({ data, reqBy }) => {
    const range = resolveRange(data);
    const { groupBy, columns, sortBy, sortOrder, page, limit } = data;

    const match = {
      orgId: reqBy.org_id,
      date: { $gte: range.startDate, $lte: range.endDate },
    };
    if (!isUndefinedOrNull(data.campaignIds) && data.campaignIds.length) {
      match.campaignId = { $in: data.campaignIds };
    } else if (!isUndefinedOrNull(data.campaignId)) {
      match.campaignId = data.campaignId;
    }
    if (!isUndefinedOrNull(data.search) && data.search !== "") {
      const rx = new RegExp(data.search, "i");
      match.$or = [{ campaignId: rx }, { pubId: rx }, { country: rx }, { bundleId: rx }];
    }

    const result = await aggregateGrouped({ match, groupBy, sortBy, sortOrder, page, limit });
    if (groupBy.includes(DIMENSION.CAMPAIGN)) await enrichCampaignTitles(result.rows);

    return buildResponse(data, range, groupBy, columns, sortBy, sortOrder, page, limit, result);
  },

  // Super-admin (cross-org) statistics report. Spans ALL organisations by
  // default; can be narrowed by orgId / campaign / bundle. Supports the `org`
  // and `bundle` dimensions and joins org name + campaign title for display.
  getSuperReport: async ({ data }) => {
    const range = resolveRange(data);
    const { groupBy, columns, sortBy, sortOrder, page, limit } = data;

    const match = { date: { $gte: range.startDate, $lte: range.endDate } };
    if (!isUndefinedOrNull(data.orgId) && data.orgId !== "") match.orgId = data.orgId;
    if (!isUndefinedOrNull(data.campaignIds) && data.campaignIds.length) {
      match.campaignId = { $in: data.campaignIds };
    } else if (!isUndefinedOrNull(data.campaignId)) {
      match.campaignId = data.campaignId;
    }
    if (!isUndefinedOrNull(data.bundle) && data.bundle !== "") match.bundleId = data.bundle;
    if (!isUndefinedOrNull(data.search) && data.search !== "") {
      const rx = new RegExp(data.search, "i");
      match.$or = [
        { campaignId: rx },
        { pubId: rx },
        { country: rx },
        { bundleId: rx },
        { orgId: rx },
      ];
    }

    const result = await aggregateGrouped({ match, groupBy, sortBy, sortOrder, page, limit });
    if (groupBy.includes(DIMENSION.CAMPAIGN)) await enrichCampaignTitles(result.rows);
    if (groupBy.includes(SUPER_DIMENSION.ORG)) await enrichOrgNames(result.rows);

    return buildResponse(data, range, groupBy, columns, sortBy, sortOrder, page, limit, result);
  },

  // Campaign drill-down: one campaign's delivery grouped by supply bundleId
  // (the app/site the ad actually ran in). Adds per-bundle extras the flat
  // report doesn't carry — eCPM, install rate, share of spend, and reach
  // (countries / placements / active days, first & last seen).
  getCampaignBundles: async ({ data, reqBy }) => {
    const range = resolveRange(data);
    const { campaignId, sortBy, sortOrder, page, limit } = data;

    if (!isObjectId(campaignId)) throw new Error("Invalid campaign id");
    const campaign = await campaignModel
      .findOne({ _id: campaignId, orgId: reqBy.org_id })
      .select({ title: 1, status: 1, type: 1, appName: 1, bundleId: 1, appOs: 1, appIconLink: 1 });
    if (isUndefinedOrNull(campaign)) throw new Error(`No campaign exists with id: ${campaignId}`);

    const match = {
      orgId: reqBy.org_id,
      campaignId,
      date: { $gte: range.startDate, $lte: range.endDate },
    };

    // The bundle search narrows the TABLE only. The summary cards stay
    // campaign-wide so share-of-spend keeps a stable denominator.
    const hasSearch = !isUndefinedOrNull(data.search) && data.search !== "";
    const bundleMatch = hasSearch
      ? [{ $match: { bundleId: new RegExp(escapeRegex(data.search), "i") } }]
      : [];

    const bundleKey = { $ifNull: ["$bundleId", ""] };
    const skip = (page - 1) * limit;
    const sortDir = sortOrder === "asc" ? 1 : -1;
    // spendShare is spent ÷ a constant, so it sorts identically to spent.
    const sortField = sortBy === BUNDLE_SORT.SPEND_SHARE ? BUNDLE_SORT.SPENT : sortBy;

    const [result] = await aggregateMetricsModel.aggregate([
      { $match: match },
      {
        $facet: {
          rows: [
            ...bundleMatch,
            {
              $group: {
                _id: bundleKey,
                ...metricAccumulators,
                countrySet: { $addToSet: "$country" },
                placementSet: { $addToSet: "$pubId" },
                dateSet: { $addToSet: "$date" },
                firstSeen: { $min: "$date" },
                lastSeen: { $max: "$date" },
              },
            },
            {
              $addFields: {
                ...derivedFields,
                cvr: {
                  $cond: [
                    { $gt: ["$clicks", 0] },
                    { $multiply: [{ $divide: ["$installs", "$clicks"] }, 100] },
                    0,
                  ],
                },
                ecpm: {
                  $cond: [
                    { $gt: ["$impressions", 0] },
                    { $multiply: [{ $divide: ["$spent", "$impressions"] }, 1000] },
                    null,
                  ],
                },
                countrySet: { $setDifference: ["$countrySet", [null, ""]] },
                placementSet: { $setDifference: ["$placementSet", [null, ""]] },
              },
            },
            {
              $addFields: {
                countries: { $size: "$countrySet" },
                placements: { $size: "$placementSet" },
                activeDays: { $size: "$dateSet" },
              },
            },
            { $sort: { [sortField]: sortDir, _id: 1 } },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                placementSet: 0,
                dateSet: 0,
              },
            },
          ],
          // Campaign-wide totals (ignores the bundle search) → summary cards.
          summary: [{ $group: { _id: null, ...metricAccumulators } }],
          // Totals of what the table is showing → the table's TOTAL row.
          tableSummary: [...bundleMatch, { $group: { _id: null, ...metricAccumulators } }],
          groupCount: [...bundleMatch, { $group: { _id: bundleKey } }, { $count: "count" }],
          allBundles: [{ $group: { _id: bundleKey } }, { $count: "count" }],
        },
      },
    ]);

    const pick = (arr) => (arr && arr[0]) || {};
    const totals = shapeBundleMetrics(pick(result && result.summary));
    const tableTotals = shapeBundleMetrics(pick(result && result.tableSummary));
    const totalGroups = pick(result && result.groupCount).count || 0;
    const bundleCount = pick(result && result.allBundles).count || 0;

    const rows = ((result && result.rows) || []).map((r) => {
      const m = shapeBundleMetrics(r);
      return {
        bundle: r._id || "",
        ...m,
        spendShare: totals.spent > 0 ? round2((m.spent / totals.spent) * 100) : 0,
        countries: r.countries || 0,
        placements: r.placements || 0,
        activeDays: r.activeDays || 0,
        countryList: (r.countrySet || []).slice().sort().slice(0, 8),
        firstSeen: r.firstSeen || null,
        lastSeen: r.lastSeen || null,
      };
    });

    return {
      campaign: {
        id: String(campaign._id),
        title: campaign.title || null,
        status: campaign.status || null,
        type: campaign.type || null,
        appName: campaign.appName || null,
        bundleId: campaign.bundleId || null,
        appOs: campaign.appOs || null,
        appIconLink: campaign.appIconLink || null,
      },
      sort: { by: sortBy, order: sortOrder },
      range: {
        preset: data.preset || null,
        startDate: range.startDate,
        endDate: range.endDate,
        timezone: range.tz,
      },
      bundleCount,
      totals,
      tableTotals,
      data: rows,
      pagination: {
        page,
        limit,
        total: totalGroups,
        totalPages: Math.ceil(totalGroups / limit),
      },
    };
  },
};

module.exports = reportService;
