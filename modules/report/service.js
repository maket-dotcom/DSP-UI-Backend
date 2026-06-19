const moment = require("moment-timezone");
// Report is driven by the SAME collection as the Dashboard (single source of
// truth) — the rolled-up daily aggregate, NOT a per-event collection. This keeps
// Report and Dashboard numbers identical and scales to real traffic volumes.
const aggregateMetricsModel = require("../aggregate-metrics/model");
const campaignModel = require("../campaign/model");
const { isUndefinedOrNull } = require("../../utils/validators");
const { EVENT_NAME, CORE_EVENTS, DIMENSION, DATE_PRESET } = require("./constant");
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

/* ------------------------------- service ------------------------------- */

const reportService = {
  // Statistics report: metrics rolled up by one or more dimensions, with a
  // grand-total row and pagination over the grouped rows. Reads the rolled-up
  // daily aggregate (same data as the Dashboard).
  getReport: async ({ data, reqBy }) => {
    const orgId = reqBy.org_id;
    const range = resolveRange(data);
    const { groupBy, columns, sortBy, sortOrder, page, limit } = data;

    // ---- match stage (org + date range + optional campaign filter + search) ----
    const match = {
      orgId,
      date: { $gte: range.startDate, $lte: range.endDate },
    };
    if (!isUndefinedOrNull(data.campaignIds) && data.campaignIds.length) {
      match.campaignId = { $in: data.campaignIds };
    } else if (!isUndefinedOrNull(data.campaignId)) {
      match.campaignId = data.campaignId;
    }
    if (!isUndefinedOrNull(data.search) && data.search !== "") {
      const rx = new RegExp(data.search, "i");
      match.$or = [{ campaignId: rx }, { pubId: rx }, { country: rx }];
    }

    // ---- group _id from selected dimensions ----
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

    // ---- shape rows: flatten dimensions to top level + rounded metrics ----
    const rows = rawRows.map((r) => ({
      ...r._id, // campaign / publisher / country / date / month values
      ...shapeMetrics(r),
    }));

    // ---- enrich with campaign title/status when grouped by campaign ----
    if (groupBy.includes(DIMENSION.CAMPAIGN)) {
      const ids = rows
        .map((r) => r[DIMENSION.CAMPAIGN])
        .filter((id) => isObjectId(id));
      if (ids.length) {
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
      }
    }

    const totals = shapeMetrics(summaryDoc);

    return {
      groupBy,
      columns,
      sort: { by: sortBy, order: sortOrder },
      range: {
        preset: data.preset || null,
        startDate: range.startDate,
        endDate: range.endDate,
        timezone: range.tz,
      },
      totals,
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
