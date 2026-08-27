const express = require("express");
const supplyController = require("./controller");
const router = express.Router();
const execute = require("../../middleware/executor");
const { authSuperAdmin } = require("../../middleware/index");

// All supply-partner routes are super-admin only (platform-level config).
router.use(authSuperAdmin);

/**
 * @swagger
 * tags:
 *   name: Supply
 *   description: Supply partners (SSP/network/publisher) — super admin only.
 *     One generic model for inbound (they call our /rtb?zone=) and outbound
 *     (we push supply to them). Zones turn the free-text ?zone= param into
 *     managed config — per-zone floors, formats, and revenue attribution.
 */

/**
 * @swagger
 * /api/v1/supply:
 *   get:
 *     summary: List supply partners (paginated)
 *     tags: [Supply]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, paused, deleted] }
 *       - in: query
 *         name: kind
 *         schema: { type: string, enum: [ssp, network, publisher, exchange] }
 *       - in: query
 *         name: flow
 *         schema: { type: string, enum: [inbound, outbound, both] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses: { 200: { description: List of supply partners } }
 */
router.get("/", execute(supplyController.list));

/**
 * @swagger
 * /api/v1/supply/{id}:
 *   get:
 *     summary: Get one supply partner
 *     tags: [Supply]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Supply partner } }
 */
router.get("/:id", execute(supplyController.getById));

/**
 * @swagger
 * /api/v1/supply:
 *   post:
 *     summary: Create a supply partner (name, flow, zones, deal, PMP deals)
 *     tags: [Supply]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Created } }
 */
router.post("/", execute(supplyController.create));

/**
 * @swagger
 * /api/v1/supply/{id}:
 *   put:
 *     summary: Update a supply partner
 *     tags: [Supply]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Updated } }
 */
router.put("/:id", execute(supplyController.update));

/**
 * @swagger
 * /api/v1/supply/{id}/status:
 *   post:
 *     summary: Activate / pause a supply partner
 *     tags: [Supply]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Status changed } }
 */
router.post("/:id/status", execute(supplyController.changeStatus));

/**
 * @swagger
 * /api/v1/supply/{id}:
 *   delete:
 *     summary: Delete a supply partner (soft delete)
 *     tags: [Supply]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Deleted } }
 */
router.delete("/:id", execute(supplyController.remove));

module.exports = router;
