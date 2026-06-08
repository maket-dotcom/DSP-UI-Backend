const moment = require("moment-timezone");
const reportModel = require("./model");
const campaignModel = require("../campaign/model");
const { isUndefinedOrNull } = require("../../utils/validators");
const { EVENT_NAME, DIMENSION, DATE_PRESET } = require("./constant");
require("dotenv").config();

/* ------------------------------- helpers ------------------------------- */

const round2 = (n) => Math.round(((n || 0) + Number.EPSILON) * 100) / 100;
const isObjectId = (v) => typeof v === "string" && /^[a-fA-F0-9]{24}$/.test(v);

// Resolve the requested period into absolute UTC instants (start..end) plus the
// display strings, honouring the caller's timezone.
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
    startInstant: start.toDate(),
    endInstant: end.toDate(),
    startDate: start.format("YYYY-MM-DD"),
    endDate: end.format("YYYY-MM-DD"),
  };
};

// Map a group-by dimension to its aggregation expression.
const dimensionExpr = (dim, tz) => {
  switch (dim) {
    case DIMENSION.CAMPAIGN:
      return "$campaignId";
    case DIMENSION.PUBLISHER:
      return "$pubId";
    case DIMENSION.COUNTRY:
      return "$country";
    case DIMENSION.REGION:
      return "$region";
    case DIMENSION.CITY:
      return "$city";
    case DIMENSION.DATE:
      return { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: tz } };
    case DIMENSION.MONTH:
      return { $dateToString: { format: "%Y-%m", date: "$createdAt", timezone: tz } };
    case DIMENSION.HOUR:
      return { $dateToString: { format: "%H", date: "$createdAt", timezone: tz } };
    default:
      return "$campaignId";
  }
};

const countIf = (eventName) => ({
  $cond: [{ $eq: ["$eventName", eventName] }, 1, 0],
});
const numPrice = {
  $convert: { input: "$price", to: "double", onError: 0, onNull: 0 },
};

const metricAccumulators = {
  clicks: { $sum: countIf(EVENT_NAME.CLICK) },
  installs: { $sum: countIf(EVENT_NAME.INSTALL) },
  impressions: { $sum: countIf(EVENT_NAME.IMPRESSION) },
  spent: { $sum: numPrice },
};

// clicks / impressions * 100 (guard divide-by-zero).
const ctrExpr = {
  $cond: [
    { $gt: ["$impressions", 0] },
    { $multiply: [{ $divide: ["$clicks", "$impressions"] }, 100] },
    0,
  ],
};

const withCtr = (doc) => ({
  clicks: doc.clicks || 0,
  installs: doc.installs || 0,
  impressions: doc.impressions || 0,
  spent: round2(doc.spent),
  ctr: round2(doc.impressions > 0 ? (doc.clicks / doc.impressions) * 100 : 0),
});

/* ------------------------------- service ------------------------------- */

const reportService = {
  // Statistics report: metrics rolled up by one or more dimensions, with a
  // grand-total row and pagination over the grouped rows.
  getReport: async ({ data, reqBy }) => {
    const orgId = reqBy.org_id;
    const range = resolveRange(data);
    const { groupBy, columns, sortBy, sortOrder, page, limit } = data;
    const tz = range.tz;

    // ---- match stage (org + date range + optional campaign filter + search) ----
    const match = {
      orgId,
      createdAt: { $gte: range.startInstant, $lte: range.endInstant },
    };
    if (!isUndefinedOrNull(data.campaignIds) && data.campaignIds.length) {
      match.campaignId = { $in: data.campaignIds };
    } else if (!isUndefinedOrNull(data.campaignId)) {
      match.campaignId = data.campaignId;
    }
    if (!isUndefinedOrNull(data.search) && data.search !== "") {
      const rx = new RegExp(data.search, "i");
      match.$or = [
        { campaignId: rx },
        { pubId: rx },
        { country: rx },
        { region: rx },
        { city: rx },
      ];
    }

    // ---- group _id from selected dimensions ----
    const groupId = {};
    groupBy.forEach((d) => {
      groupId[d] = dimensionExpr(d, tz);
    });

    const skip = (page - 1) * limit;
    const sortDir = sortOrder === "asc" ? 1 : -1;

    const [result] = await reportModel.aggregate([
      { $match: match },
      {
        $facet: {
          rows: [
            { $group: { _id: groupId, ...metricAccumulators } },
            { $addFields: { ctr: ctrExpr } },
            { $sort: { [sortBy]: sortDir, _id: 1 } },
            { $skip: skip },
            { $limit: limit },
          ],
          summary: [
            { $group: { _id: null, ...metricAccumulators } },
          ],
          groupCount: [
            { $group: { _id: groupId } },
            { $count: "count" },
          ],
        },
      },
    ]);

    const rawRows = (result && result.rows) || [];
    const summaryDoc = (result && result.summary && result.summary[0]) || {};
    const totalGroups =
      (result && result.groupCount && result.groupCount[0] && result.groupCount[0].count) || 0;

    // ---- shape rows: flatten dimensions to top level + rounded metrics ----
    const rows = rawRows.map((r) => ({
      ...r._id, // campaign / publisher / country / ... values
      ...withCtr(r),
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

    const totals = withCtr(summaryDoc);

    return {
      groupBy,
      columns,
      sort: { by: sortBy, order: sortOrder },
      range: {
        preset: data.preset || null,
        startDate: range.startDate,
        endDate: range.endDate,
        timezone: tz,
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
