const express = require("express");
const segmentController = require("./controller");
const router = express.Router();
const execute = require("../../middleware/executor");
const { auth, authSuperAdmin, accessAllowed, requirePermission } = require("../../middleware/index");
const { TYPE: USER_TYPE } = require("../user/constant");
const { RESOURCES, ACTIONS } = require("../userConfig/constant");

// Browsing segments is part of line item setup → CAMPAIGN view, for org and network users.
const allowed = accessAllowed([
  USER_TYPE.SUPER_ADMIN, USER_TYPE.ADMIN, USER_TYPE.TEAM, USER_TYPE.NETWORK_ADMIN, USER_TYPE.NETWORK_TEAM,
]);
const canView = requirePermission(RESOURCES.CAMPAIGN, ACTIONS.VIEW);

/**
 * @swagger
 * tags:
 *   name: Segments
 *   description: Audience segments line items can target. The catalog (from the audience segment workbook) is
 *     decided from bid request fields; IAB Audience Taxonomy 1.1 segments are supplied by the exchange in
 *     user.data (segtax 4). Segments that need data we don't have yet are listed but can't be targeted.
 */

/**
 * @swagger
 * /api/v1/segment/list:
 *   get:
 *     summary: Segments, in catalog order
 *     tags: [Segments]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: source, schema: { type: string, enum: [catalog, iab], default: catalog } }
 *       - { in: query, name: country, schema: { type: string, default: IN } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: category, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [live, needs_data, not_offered] } }
 *       - { in: query, name: route, schema: { type: string, enum: [request, app_usage, modeled, exchange] } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer, maximum: 100 } }
 *     responses: { 200: { description: Segments } }
 */
router.get("/list", auth, allowed, canView, execute(segmentController.list));

/**
 * @swagger
 * /api/v1/segment/facets:
 *   get:
 *     summary: Segment counts per status and category, and the latest workbook upload
 *     tags: [Segments]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: query, name: country, schema: { type: string, default: IN } } ]
 *     responses: { 200: { description: Facets } }
 */
router.get("/facets", auth, allowed, canView, execute(segmentController.facets));

/**
 * @swagger
 * /api/v1/segment/resolve:
 *   get:
 *     summary: The segments behind a list of keys (a line item's include / exclude)
 *     tags: [Segments]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: query, name: keys, required: true, schema: { type: string, example: "in.26,iab4.243" } } ]
 *     responses: { 200: { description: Segments, in the order asked } }
 */
router.get("/resolve", auth, allowed, canView, execute(segmentController.resolve));

/**
 * @swagger
 * /api/v1/segment/upload:
 *   post:
 *     summary: (super admin) Replace a country's segment catalog with the workbook (.xlsx or .csv)
 *     tags: [Segments]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [country, fileName, file]
 *             properties:
 *               country: { type: string, example: IN }
 *               fileName: { type: string, example: India_Mobile_Audience_Segments_500.xlsx }
 *               file: { type: string, description: "The whole file, base64" }
 *     responses: { 200: { description: Loaded } }
 */
router.post("/upload", authSuperAdmin, execute(segmentController.upload));

/**
 * @swagger
 * /api/v1/segment/uploads:
 *   get:
 *     summary: (super admin) Latest workbook uploads
 *     tags: [Segments]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Uploads } }
 */
router.get("/uploads", authSuperAdmin, execute(segmentController.uploads));

module.exports = router;
