const express = require("express");
const reportController = require("./controller");
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
 *   name: Report
 *   description: Statistics report (group-by metrics with filters). Org-scoped via
 *     the caller's token; super-admins supply org via the 'x-org-id' header.
 */

/**
 * @swagger
 * /api/v1/report/data:
 *   post:
 *     summary: Get statistics report data grouped by one or more dimensions
 *     tags: [Report]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               groupBy:
 *                 type: array
 *                 items: { type: string, enum: [campaign, publisher, country, region, city, date, month, hour] }
 *                 description: One or more dimensions. Default ["campaign"].
 *               columns:
 *                 type: array
 *                 items: { type: string, enum: [clicks, installs, impressions, ctr, spent] }
 *                 description: Which metric columns to display. Default ["clicks","installs","ctr","spent"].
 *               campaignId: { type: string, description: "Filter to a single campaign" }
 *               campaignIds:
 *                 type: array
 *                 items: { type: string }
 *                 description: Filter to multiple campaigns
 *               search: { type: string, description: "Regex search across campaignId/publisher/country/region/city" }
 *               preset: { type: string, enum: [today, yesterday, last_7_days, last_30_days, this_month, last_month] }
 *               startDate: { type: string, example: "2026-05-01", description: "Custom range start (with endDate)" }
 *               endDate: { type: string, example: "2026-05-31", description: "Custom range end (with startDate)" }
 *               timezone: { type: string, example: "Asia/Kolkata", description: "IANA tz for preset boundaries + date/month/hour grouping. Default UTC." }
 *               sortBy: { type: string, enum: [clicks, installs, impressions, ctr, spent], default: spent }
 *               sortOrder: { type: string, enum: [asc, desc], default: desc }
 *               page: { type: integer, default: 1 }
 *               limit: { type: integer, default: 20, maximum: 200 }
 *     responses:
 *       200:
 *         description: Report data fetched successfully
 */
router.post(
  "/data",
  auth,
  accessAllowed([TYPE.SUPER_ADMIN, TYPE.ADMIN, TYPE.TEAM]),
  requirePermission(RESOURCES.REPORT, ACTIONS.VIEW),
  execute(reportController.getReport)
);

module.exports = router;
