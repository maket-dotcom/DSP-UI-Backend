const express = require("express");
const controller = require("./controller");
const execute = require("../../middleware/executor");
const { auth, accessAllowed } = require("../../middleware/index");
const { TYPE } = require("../user/constant");

const router = express.Router();


/**
 * @swagger
 * tags:
 *   name: MCP Publisher
 *   description: Supply-side "Monetize your MCP" — register MCP servers,
 *     configure placements, issue bidder API keys, get integration details.
 */

/**
 * @swagger
 * /api/v1/mcp-publisher/categories:
 *   get:
 *     summary: Category taxonomy and intents used for MCP targeting
 *     tags: [MCP Publisher]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Categories and intents } }
 */
// Read-only taxonomy: also used by advertisers building MCP campaigns.
router.get(
  "/categories",
  auth,
  accessAllowed([TYPE.SUPPLY, TYPE.ADMIN, TYPE.TEAM]),
  execute(controller.listCategories)
);

// Everything below is publisher (supply) self-service. Super admins pass
// accessAllowed too, but `auth` makes them name the org via x-org-id.
router.use(auth, accessAllowed([TYPE.SUPPLY]));

/**
 * @swagger
 * /api/v1/mcp-publisher/servers:
 *   get:
 *     summary: List my MCP servers (paginated)
 *     tags: [MCP Publisher]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [draft, in_review, live, paused, rejected, suspended] } }
 *       - { in: query, name: search, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *     responses: { 200: { description: List of MCP servers } }
 *   post:
 *     summary: Register an MCP server (starts as draft with a default tool_footer placement)
 *     tags: [MCP Publisher]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, categories]
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               serverUrl: { type: string, description: "https remote MCP endpoint (optional)" }
 *               homepage: { type: string }
 *               transport: { type: string, enum: [stdio, http, both] }
 *               categories: { type: array, items: { type: string } }
 *               blockedCategories: { type: array, items: { type: string } }
 *               blockedAdvertiserDomains: { type: array, items: { type: string } }
 *               blockedHosts: { type: array, items: { type: string } }
 *               placements: { type: array, items: { type: object } }
 *     responses: { 200: { description: Created } }
 */
router.get("/servers", execute(controller.listServers));
router.post("/servers", execute(controller.createServer));

/**
 * @swagger
 * /api/v1/mcp-publisher/servers/{id}:
 *   get:
 *     summary: Get one of my MCP servers
 *     tags: [MCP Publisher]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: MCP server } }
 *   put:
 *     summary: Update an MCP server (not while in_review or suspended)
 *     tags: [MCP Publisher]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Updated } }
 *   delete:
 *     summary: Delete an MCP server and revoke all its keys
 *     tags: [MCP Publisher]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Deleted } }
 */
router.get("/servers/:id", execute(controller.getServer));
router.put("/servers/:id", execute(controller.updateServer));
router.delete("/servers/:id", execute(controller.deleteServer));

/**
 * @swagger
 * /api/v1/mcp-publisher/servers/{id}/submit:
 *   post:
 *     summary: Submit a draft/rejected server for super-admin review
 *     tags: [MCP Publisher]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Now in_review } }
 */
router.post("/servers/:id/submit", execute(controller.submitServer));

/**
 * @swagger
 * /api/v1/mcp-publisher/servers/{id}/status:
 *   post:
 *     summary: Publisher kill switch — pause or resume a live server
 *     tags: [MCP Publisher]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [status], properties: { status: { type: string, enum: [live, paused] } } }
 *     responses: { 200: { description: Status changed } }
 */
router.post("/servers/:id/status", execute(controller.changeStatus));

/**
 * @swagger
 * /api/v1/mcp-publisher/servers/{id}/keys:
 *   get:
 *     summary: List API keys for a server (secrets are never returned)
 *     tags: [MCP Publisher]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Keys } }
 *   post:
 *     summary: Create a test or live API key — the secret is returned once
 *     tags: [MCP Publisher]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [mode], properties: { mode: { type: string, enum: [test, live] }, label: { type: string } } }
 *     responses: { 200: { description: Key created (includes secret) } }
 */
router.get("/servers/:id/keys", execute(controller.listKeys));
router.post("/servers/:id/keys", execute(controller.createKey));

/**
 * @swagger
 * /api/v1/mcp-publisher/servers/{id}/keys/{keyId}:
 *   delete:
 *     summary: Revoke an API key
 *     tags: [MCP Publisher]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *       - { in: path, name: keyId, required: true, schema: { type: string } }
 *     responses: { 200: { description: Revoked } }
 */
router.delete("/servers/:id/keys/:keyId", execute(controller.revokeKey));

/**
 * @swagger
 * /api/v1/mcp-publisher/servers/{id}/integration:
 *   get:
 *     summary: Bidder HTTPS URL, endpoints, active key prefixes and SDK snippet
 *     tags: [MCP Publisher]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Integration details } }
 */
router.get("/servers/:id/integration", execute(controller.getIntegration));

module.exports = router;
