const express = require("express");
const inventoryController = require("./controller");
const router = express.Router();
const execute = require("../../middleware/executor");
const { auth, authSuperAdmin, accessAllowed, requirePermission } = require("../../middleware/index");
const { TYPE: USER_TYPE } = require("../user/constant");
const { RESOURCES, ACTIONS } = require("../userConfig/constant");

// Browsing inventory is part of line item setup → CAMPAIGN view, for org and network users.
const allowed = accessAllowed([
  USER_TYPE.SUPER_ADMIN, USER_TYPE.ADMIN, USER_TYPE.TEAM, USER_TYPE.NETWORK_ADMIN, USER_TYPE.NETWORK_TEAM,
]);
const canView = requirePermission(RESOURCES.CAMPAIGN, ACTIONS.VIEW);

/**
 * @swagger
 * tags:
 *   name: Inventory
 *   description: Exchange inventory reports (apps by bundle or name, per exchange and device, with request
 *     volumes) for the line item's Inventory list, plus the OEM partner list.
 */

/**
 * @swagger
 * /api/v1/inventory/apps:
 *   get:
 *     summary: Apps in a country's inventory, busiest first (one row per app across exchanges / devices)
 *     tags: [Inventory]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: country, schema: { type: string, default: IN } }
 *       - { in: query, name: kind, schema: { type: string, enum: [bundle, name], default: bundle } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: exchange, schema: { type: string } }
 *       - { in: query, name: deviceType, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer, maximum: 100 } }
 *     responses: { 200: { description: Apps } }
 */
router.get("/apps", auth, allowed, canView, execute(inventoryController.apps));

/**
 * @swagger
 * /api/v1/inventory/facets:
 *   get:
 *     summary: Countries, exchanges and device types loaded, and when each report was uploaded
 *     tags: [Inventory]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: query, name: country, schema: { type: string, default: IN } } ]
 *     responses: { 200: { description: Facets } }
 */
router.get("/facets", auth, allowed, canView, execute(inventoryController.facets));

/**
 * @swagger
 * /api/v1/inventory/partners:
 *   get:
 *     summary: OEMs a line item can be planned against
 *     tags: [Inventory]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Partners } }
 */
router.get("/partners", auth, allowed, canView, execute(inventoryController.partners));

/**
 * @swagger
 * /api/v1/inventory/upload:
 *   post:
 *     summary: (super admin) Replace a country's inventory with a report CSV (bundle or name report)
 *     tags: [Inventory]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [country, csv]
 *             properties:
 *               country: { type: string, example: IN }
 *               fileName: { type: string }
 *               csv: { type: string, description: "The whole CSV file as text" }
 *     responses: { 200: { description: Loaded } }
 */
router.post("/upload", authSuperAdmin, execute(inventoryController.upload));

/**
 * @swagger
 * /api/v1/inventory/uploads:
 *   get:
 *     summary: (super admin) Latest inventory uploads
 *     tags: [Inventory]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Uploads } }
 */
router.get("/uploads", authSuperAdmin, execute(inventoryController.uploads));

module.exports = router;
