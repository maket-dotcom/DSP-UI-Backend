const aggregateMetricsModel = require("./model");
const campaignModel = require("../campaign/model");
const { isUndefinedOrNull } = require("../../utils/validators");
const { CORE_EVENTS, METRIC, DATE_PRESET, EVENT_NAME } = require("./constant");
const {
  STATUS: CAMPAIGN_STATUS,
  MOBILE_GOALS,
} = require("../campaign/constant");

require("dotenv").config();

/* ----------------------------- date helpers ----------------------------- */

const pad = (n) => String(n).padStart(2, "0");
const fmt = (d) =>
  `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parse = (s) => new Date(`${s}T00:00:00.000Z`);
const addDays = (d, n) => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};
const round2 = (n) => Math.round(((n || 0) + Number.EPSILON) * 100) / 100;

// Resolve the current period (from explicit dates or a preset) plus the
// immediately-preceding period of equal length (for % change comparisons).
const resolveRange = (data = {}) => {
  let { preset, startDate, endDate } = data;
  let start;
  let end;

  if (!isUndefinedOrNull(startDate) && !isUndefinedOrNull(endDate)) {
    start = parse(startDate);
    end = parse(endDate);
  } else {
    const p = preset || DATE_PRESET.LAST_7_DAYS;
    const today = parse(fmt(new Date()));
    switch (p) {
      case DATE_PRESET.TODAY:
        start = today;
        end = today;
        break;
      case DATE_PRESET.YESTERDAY:
        start = addDays(today, -1);
        end = addDays(today, -1);
        break;
      case DATE_PRESET.LAST_30_DAYS:
        end = today;
        start = addDays(today, -29);
        break;
      case DATE_PRESET.LAST_90_DAYS:
        end = today;
        start = addDays(today, -89);
        break;
      case DATE_PRESET.LAST_7_DAYS:
      default:
        end = today;
        start = addDays(today, -6);
        break;
    }
  }

  if (start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }

  const days = Math.round((end - start) / 86400000) + 1;
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(days - 1));

  return {
    startDate: fmt(start),
    endDate: fmt(end),
    prevStartDate: fmt(prevStart),
    prevEndDate: fmt(prevEnd),
    days,
  };
};

const enumerateDates = (startStr, endStr) => {
  const out = [];
  let d = parse(startStr);
  const end = parse(endStr);
  let guard = 0;
  while (d <= end && guard < 400) {
    out.push(fmt(d));
    d = addDays(d, 1);
    guard += 1;
  }
  return out;
};

/* --------------------------- aggregation atoms -------------------------- */

// bidCount/unitBidPrice are stored as strings; convert safely (bad/empty -> 0).
const numBid = {
  $convert: { input: "$bidCount", to: "double", onError: 0, onNull: 0 },
};
const numPrice = {
  $convert: { input: "$unitBidPrice", to: "double", onError: 0, onNull: 0 },
};
const spentExpr = { $multiply: [numBid, numPrice] };
const countIf = (eventName) => ({
  $cond: [{ $eq: ["$eventName", eventName] }, numBid, 0],
});
// Custom in-app events = anything that is not a core funnel event.
const eventsExpr = { $cond: [{ $in: ["$eventName", CORE_EVENTS] }, 0, numBid] };

const perDocMetric = (metric) => {
  switch (metric) {
    case METRIC.SPENT:
      return spentExpr;
    case METRIC.EVENTS:
      return eventsExpr;
    case METRIC.INSTALL:
      return countIf(EVENT_NAME.INSTALL);
    case METRIC.CLICK:
      return countIf(EVENT_NAME.CLICK);
    case METRIC.IMPRESSION:
      return countIf(EVENT_NAME.IMPRESSION);
    case METRIC.RE_ENGAGEMENT:
      return countIf(EVENT_NAME.RE_ENGAGEMENT);
    default:
      return spentExpr;
  }
};

const buildMatch = (orgId, campaignId, start, end) => {
  const match = { orgId, date: { $gte: start, $lte: end } };
  if (!isUndefinedOrNull(campaignId)) match.campaignId = campaignId;
  return match;
};

const pctChange = (cur, prev) => {
  if (!prev) return cur > 0 ? 100 : 0;
  return round2(((cur - prev) / prev) * 100);
};

// Roll up all dashboard metrics for one period in a single pass.
const aggregateTotals = async ({ orgId, campaignId, start, end }) => {
  const res = await aggregateMetricsModel.aggregate([
    { $match: buildMatch(orgId, campaignId, start, end) },
    {
      $group: {
        _id: null,
        spent: { $sum: spentExpr },
        install: { $sum: countIf(EVENT_NAME.INSTALL) },
        click: { $sum: countIf(EVENT_NAME.CLICK) },
        impression: { $sum: countIf(EVENT_NAME.IMPRESSION) },
        reEngagement: { $sum: countIf(EVENT_NAME.RE_ENGAGEMENT) },
        events: { $sum: eventsExpr },
      },
    },
  ]);
  return (
    res[0] || {
      spent: 0,
      install: 0,
      click: 0,
      impression: 0,
      reEngagement: 0,
      events: 0,
    }
  );
};

/* ------------------------------- services ------------------------------- */

const aggregateMetricsService = {
  // Top stat cards: each metric's value + % change vs the previous period,
  // plus active/total campaign counts.
  getSummary: async ({ data, reqBy }) => {
    const orgId = reqBy.org_id;
    const { campaignId } = data;
    const range = resolveRange(data);

    const [cur, prev] = await Promise.all([
      aggregateTotals({
        orgId,
        campaignId,
        start: range.startDate,
        end: range.endDate,
      }),
      aggregateTotals({
        orgId,
        campaignId,
        start: range.prevStartDate,
        end: range.prevEndDate,
      }),
    ]);

    const reEngGoal = MOBILE_GOALS.RETARGETIN; // 'retargeting'
    const [campTotal, campActive, reTotal, reActive] = await Promise.all([
      campaignModel.countDocuments({
        orgId,
        status: { $ne: CAMPAIGN_STATUS.DELETED },
      }),
      campaignModel.countDocuments({ orgId, status: CAMPAIGN_STATUS.ACTIVE }),
      campaignModel.countDocuments({
        orgId,
        goal: reEngGoal,
        status: { $ne: CAMPAIGN_STATUS.DELETED },
      }),
      campaignModel.countDocuments({
        orgId,
        goal: reEngGoal,
        status: CAMPAIGN_STATUS.ACTIVE,
      }),
    ]);

    return {
      range,
      data: {
        spent: { value: round2(cur.spent), changePct: pctChange(cur.spent, prev.spent) },
        install: { value: cur.install, changePct: pctChange(cur.install, prev.install) },
        click: { value: cur.click, changePct: pctChange(cur.click, prev.click) },
        events: { value: cur.events, changePct: pctChange(cur.events, prev.events) },
        reEngagements: { active: reActive, total: reTotal },
        campaigns: { active: campActive, total: campTotal },
      },
    };
  },

  // Performance line chart: date-wise series of one metric, current vs previous.
  getPerformance: async ({ data, reqBy }) => {
    const orgId = reqBy.org_id;
    const { campaignId } = data;
    const metric = data.metric || METRIC.INSTALL;
    const range = resolveRange(data);
    const expr = perDocMetric(metric);

    const seriesFor = async (start, end) => {
      const rows = await aggregateMetricsModel.aggregate([
        { $match: buildMatch(orgId, campaignId, start, end) },
        { $group: { _id: "$date", value: { $sum: expr } } },
      ]);
      const map = {};
      rows.forEach((r) => {
        map[r._id] = r.value;
      });
      // Fill gaps so the chart has a continuous point per day.
      return enumerateDates(start, end).map((d) => ({
        date: d,
        value: round2(map[d] || 0),
      }));
    };

    const [current, previous] = await Promise.all([
      seriesFor(range.startDate, range.endDate),
      seriesFor(range.prevStartDate, range.prevEndDate),
    ]);

    return { metric, range, data: { current, previous } };
  },

  // Goal Report bar chart: total bidCount grouped by eventName.
  getGoalReport: async ({ data, reqBy }) => {
    const orgId = reqBy.org_id;
    const { campaignId } = data;
    const range = resolveRange(data);

    const rows = await aggregateMetricsModel.aggregate([
      { $match: buildMatch(orgId, campaignId, range.startDate, range.endDate) },
      { $group: { _id: "$eventName", value: { $sum: numBid } } },
      { $sort: { value: -1 } },
    ]);

    return {
      range,
      data: rows.map((r) => ({ eventName: r._id, value: round2(r.value) })),
    };
  },

  // Top Campaigns table: per-campaign click/install/events/spent, joined to
  // the campaign's title + status, sorted by `sortBy`, limited to `limit`.
  getTopCampaigns: async ({ data, reqBy }) => {
    const orgId = reqBy.org_id;
    const sortBy = data.sortBy || "spent";
    const limit = data.limit || 10;
    const range = resolveRange(data);

    const rows = await aggregateMetricsModel.aggregate([
      { $match: { orgId, date: { $gte: range.startDate, $lte: range.endDate } } },
      {
        $group: {
          _id: "$campaignId",
          click: { $sum: countIf(EVENT_NAME.CLICK) },
          install: { $sum: countIf(EVENT_NAME.INSTALL) },
          events: { $sum: eventsExpr },
          spent: { $sum: spentExpr },
        },
      },
      { $sort: { [sortBy]: -1 } },
      { $limit: limit },
      {
        $lookup: {
          // campaignId is stored as a string; campaign._id is an ObjectId.
          from: campaignModel.collection.name,
          let: { cid: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: [{ $toString: "$_id" }, "$$cid"] } } },
            { $project: { title: 1, status: 1 } },
          ],
          as: "campaign",
        },
      },
      { $unwind: { path: "$campaign", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          campaignId: "$_id",
          title: "$campaign.title",
          status: "$campaign.status",
          click: 1,
          install: 1,
          events: 1,
          spent: { $round: ["$spent", 2] },
        },
      },
    ]);

    return { range, sortBy, data: rows };
  },
};

module.exports = aggregateMetricsService;
