const express = require("express");
const superAdminController = require("./controller");
const router = express.Router();
const execute = require("../../middleware/executor");
const { authSuperAdmin } = require("../../middleware/index");

// Every route here is cross-org and super-admin only. authSuperAdmin resolves
// the token and asserts type === super_admin (no x-org-id needed).
router.use(authSuperAdmin);

/**
 * @swagger
 * tags:
 *   name: SuperAdmin
 *   description: Platform-wide (all-orgs) views for super admins
 */

/**
 * @swagger
 * /api/v1/super-admin/dashboard/summary:
 *   get:
 *     summary: Aggregated stat cards across ALL organisations
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: preset
 *         schema: { type: string, enum: [today, yesterday, last_7_days, last_30_days, last_90_days] }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, example: "2026-06-01" }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, example: "2026-06-12" }
 *     responses:
 *       200: { description: All-orgs summary }
 */
router.get("/dashboard/summary", execute(superAdminController.dashboardSummary));

/**
 * @swagger
 * /api/v1/super-admin/orgs:
 *   get:
 *     summary: Per-organisation rollup (for the org table + "Enter" action)
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: preset
 *         schema: { type: string }
 *       - in: query
 *         name: startDate
 *         schema: { type: string }
 *       - in: query
 *         name: endDate
 *         schema: { type: string }
 *     responses:
 *       200: { description: List of orgs with metrics }
 */
router.get("/orgs", execute(superAdminController.orgs));

/**
 * @swagger
 * /api/v1/super-admin/campaigns:
 *   get:
 *     summary: All campaigns across every org (for the bid-config picker)
 *     tags: [SuperAdmin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: List of campaigns }
 */
router.get("/campaigns", execute(superAdminController.campaigns));

module.exports = router;
