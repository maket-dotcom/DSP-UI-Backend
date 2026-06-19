const express = require("express");
const aggregateMetricsController = require("./controller");
const router = express.Router();
const execute = require("../../middleware/executor");
const {
  auth,
  accessAllowed,
  requirePermission,
} = require("../../middleware/index");
const { TYPE } = require("../user/constant");
const { RESOURCES, ACTIONS } = require("../userConfig/constant");

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Aggregate metrics for the dashboard. All endpoints are org-scoped
 *     via the caller's token. Super-admins must supply the target org via the
 *     'x-org-id' header (or '?orgId=' query param). The date range is controlled
 *     either by an explicit startDate + endDate (YYYY-MM-DD) or a relative preset
 *     (defaults to last_7_days). Each response also returns the immediately
 *     preceding equal-length period for % change comparisons.
 */

/**
 * @swagger
 * /api/v1/dashboard/summary:
 *   get:
 *     summary: Top stat cards (spent, install, click, events) with % change vs the previous period, plus campaign and re-engagement counts
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: preset
 *         schema: { type: string, enum: [today, yesterday, last_7_days, last_30_days, last_90_days] }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, example: "2026-05-01" }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, example: "2026-05-31" }
 *       - in: query
 *         name: campaignId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Summary fetched successfully
 */
router.get(
  "/summary",
  auth,
  accessAllowed([TYPE.SUPER_ADMIN, TYPE.ADMIN, TYPE.TEAM]),
  requirePermission(RESOURCES.REPORT, ACTIONS.VIEW),
  execute(aggregateMetricsController.getSummary)
);

/**
 * @swagger
 * /api/v1/dashboard/performance:
 *   get:
 *     summary: Performance line chart - date-wise series of one metric (current vs previous period)
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: preset
 *         schema: { type: string, enum: [today, yesterday, last_7_days, last_30_days, last_90_days] }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, example: "2026-05-01" }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, example: "2026-05-31" }
 *       - in: query
 *         name: campaignId
 *         schema: { type: string }
 *       - in: query
 *         name: metric
 *         schema: { type: string, enum: [spent, install, click, impression, events, re-engagement], default: install }
 *     responses:
 *       200:
 *         description: Performance series fetched successfully
 */
router.get(
  "/performance",
  auth,
  accessAllowed([TYPE.SUPER_ADMIN, TYPE.ADMIN, TYPE.TEAM]),
  requirePermission(RESOURCES.REPORT, ACTIONS.VIEW),
  execute(aggregateMetricsController.getPerformance)
);

/**
 * @swagger
 * /api/v1/dashboard/goal-report:
 *   get:
 *     summary: Goal Report bar chart - total bidCount grouped by eventName
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: preset
 *         schema: { type: string, enum: [today, yesterday, last_7_days, last_30_days, last_90_days] }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, example: "2026-05-01" }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, example: "2026-05-31" }
 *       - in: query
 *         name: campaignId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Goal report fetched successfully
 */
router.get(
  "/goal-report",
  auth,
  accessAllowed([TYPE.SUPER_ADMIN, TYPE.ADMIN, TYPE.TEAM]),
  requirePermission(RESOURCES.REPORT, ACTIONS.VIEW),
  execute(aggregateMetricsController.getGoalReport)
);

/**
 * @swagger
 * /api/v1/dashboard/top-campaigns:
 *   get:
 *     summary: Top Campaigns table - per-campaign click/install/events/spent, joined to title + status
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: preset
 *         schema: { type: string, enum: [today, yesterday, last_7_days, last_30_days, last_90_days] }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, example: "2026-05-01" }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, example: "2026-05-31" }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [click, install, events, spent, cpi, cpc], default: spent }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, minimum: 1, maximum: 50 }
 *     responses:
 *       200:
 *         description: Top campaigns fetched successfully
 */
router.get(
  "/top-campaigns",
  auth,
  accessAllowed([TYPE.SUPER_ADMIN, TYPE.ADMIN, TYPE.TEAM]),
  requirePermission(RESOURCES.REPORT, ACTIONS.VIEW),
  execute(aggregateMetricsController.getTopCampaigns)
);

module.exports = router;
