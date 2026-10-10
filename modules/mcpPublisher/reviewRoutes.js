const express = require("express");
const controller = require("./controller");
const execute = require("../../middleware/executor");
const { authSuperAdmin } = require("../../middleware/index");

const router = express.Router();

// Review queue for MCP servers and MCP campaign creatives — super admin only.
router.use(authSuperAdmin);

/**
 * @swagger
 * tags:
 *   name: MCP Review
 *   description: Super-admin review of MCP publisher servers and MCP campaign creatives.
 */

/**
 * @swagger
 * /api/v1/mcp-review/servers:
 *   get:
 *     summary: List MCP servers across orgs (defaults to in_review)
 *     tags: [MCP Review]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: status, schema: { type: string } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses: { 200: { description: MCP servers } }
 */
router.get("/servers", execute(controller.reviewListServers));

/**
 * @swagger
 * /api/v1/mcp-review/servers/{id}/decision:
 *   post:
 *     summary: Approve, reject or suspend an MCP server
 *     tags: [MCP Review]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [decision]
 *             properties:
 *               decision: { type: string, enum: [approve, reject, suspend] }
 *               notes: { type: string, description: "required for reject" }
 *               revShare: { type: number, description: "publisher share 0..1" }
 *     responses: { 200: { description: Decision applied } }
 */
router.post("/servers/:id/decision", execute(controller.reviewDecideServer));

/**
 * @swagger
 * /api/v1/mcp-review/campaigns:
 *   get:
 *     summary: List MCP campaigns by creative review status (defaults to pending)
 *     tags: [MCP Review]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: query, name: reviewStatus, schema: { type: string, enum: [pending, approved, rejected] } } ]
 *     responses: { 200: { description: MCP campaigns } }
 */
router.get("/campaigns", execute(controller.reviewListCampaigns));

/**
 * @swagger
 * /api/v1/mcp-review/campaigns/{id}/decision:
 *   post:
 *     summary: Approve or reject an MCP campaign's creative
 *     tags: [MCP Review]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [decision]
 *             properties:
 *               decision: { type: string, enum: [approve, reject] }
 *               notes: { type: string }
 *     responses: { 200: { description: Decision applied } }
 */
router.post("/campaigns/:id/decision", execute(controller.reviewDecideCampaign));

module.exports = router;
