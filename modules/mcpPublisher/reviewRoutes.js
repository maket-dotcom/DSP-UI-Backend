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
 * /api/v1/mcp-review/categories:
 *   get:
 *     summary: MCP category taxonomy and intents (for configuring campaigns)
 *     tags: [MCP Review]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Categories and intents } }
 */
router.get("/categories", execute(controller.reviewCategories));

/**
 * @swagger
 * /api/v1/mcp-review/servers:
 *   get:
 *     summary: List MCP servers across orgs (status=all or omitted: every non-deleted server)
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
 *     summary: List campaigns opted in to MCP by review status (defaults to pending), with a suggested ad
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
 *     summary: Approve or reject an opted-in campaign's MCP ad (approve requires a saved config)
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

/**
 * @swagger
 * /api/v1/mcp-review/campaigns/{id}/config:
 *   put:
 *     summary: Set the MCP ad (copy, destination, image) and bid/targeting for an opted-in campaign
 *     tags: [MCP Review]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bid, categories, creative]
 *             properties:
 *               bid: { type: number, description: "USD per valid click" }
 *               categories: { type: array, items: { type: string } }
 *               keywords: { type: array, items: { type: string } }
 *               dailyBudget: { type: number, description: "USD cap for MCP spend; empty = campaign dailyBudget" }
 *               creative:
 *                 type: object
 *                 properties:
 *                   advertiser: { type: string }
 *                   title: { type: string }
 *                   description: { type: string }
 *                   cta: { type: string }
 *                   destinationUrl: { type: string }
 *                   displayDomain: { type: string }
 *                   imageUrl: { type: string }
 *     responses: { 200: { description: Saved } }
 */
router.put("/campaigns/:id/config", execute(controller.reviewSaveCampaignConfig));

module.exports = router;
