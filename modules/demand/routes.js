const express = require("express");
const demandController = require("./controller");
const router = express.Router();
const execute = require("../../middleware/executor");
const { authSuperAdmin } = require("../../middleware/index");

// All demand-partner routes are super-admin only (platform-level config).
router.use(authSuperAdmin);

/**
 * @swagger
 * tags:
 *   name: Demand
 *   description: External demand partners (DSP/SSP/exchange) — super admin only.
 *     The engine calls these partners per impression, runs a unified auction with
 *     internal campaigns, and keeps a per-partner margin (the "cut").
 */

/**
 * @swagger
 * /api/v1/demand:
 *   get:
 *     summary: List demand partners (paginated)
 *     tags: [Demand]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, paused, deleted] }
 *       - in: query
 *         name: partnerKind
 *         schema: { type: string, enum: [dsp, ssp, exchange, network] }
 *       - in: query
 *         name: integration
 *         schema: { type: string, enum: [rtb, vast, passback, prebid, deal] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses: { 200: { description: List of demand partners } }
 */
router.get("/", execute(demandController.list));

/**
 * @swagger
 * /api/v1/demand/{id}:
 *   get:
 *     summary: Get one demand partner
 *     tags: [Demand]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Demand partner } }
 */
router.get("/:id", execute(demandController.getById));

/**
 * @swagger
 * /api/v1/demand:
 *   post:
 *     summary: Create a demand partner (name, geo-wise endpoints, margin, targeting)
 *     tags: [Demand]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Created } }
 */
router.post("/", execute(demandController.create));

/**
 * @swagger
 * /api/v1/demand/{id}:
 *   put:
 *     summary: Update a demand partner
 *     tags: [Demand]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Updated } }
 */
router.put("/:id", execute(demandController.update));

/**
 * @swagger
 * /api/v1/demand/{id}/status:
 *   post:
 *     summary: Activate / pause a demand partner
 *     tags: [Demand]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Status changed } }
 */
router.post("/:id/status", execute(demandController.changeStatus));

/**
 * @swagger
 * /api/v1/demand/{id}:
 *   delete:
 *     summary: Delete a demand partner (soft delete)
 *     tags: [Demand]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Deleted } }
 */
router.delete("/:id", execute(demandController.remove));

module.exports = router;
