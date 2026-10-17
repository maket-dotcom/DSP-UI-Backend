const express = require("express");
const networkController = require("./controller");
const router = express.Router();
const execute = require("../../middleware/executor");
const { auth, accessAllowed, requirePermission } = require("../../middleware/index");
const { TYPE: USER_TYPE } = require("../user/constant");
const { RESOURCES, ACTIONS } = require("../userConfig/constant");

// Networks are managed by the org; network users never reach these routes.
const allowed = accessAllowed([USER_TYPE.SUPER_ADMIN, USER_TYPE.ADMIN, USER_TYPE.TEAM]);
const can = (action) => requirePermission(RESOURCES.NETWORK, action);

/**
 * @swagger
 * tags:
 *   name: Network
 *   description: Networks inside an organization. Each network has its own logins
 *     and advertisers. Org users enter a network by sending the `x-network-id` header.
 */

/**
 * @swagger
 * /api/v1/network/current:
 *   get:
 *     summary: The network the caller is working in (null at org level)
 *     tags: [Network]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Network or null } }
 */
router.get("/current", auth, execute(networkController.current));

/**
 * @swagger
 * /api/v1/network/list:
 *   get:
 *     summary: List the org's networks (paginated, with advertiser / campaign / user counts)
 *     tags: [Network]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: status, schema: { type: string, enum: [active, inactive] } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses: { 200: { description: Networks } }
 */
router.get("/list", auth, allowed, can(ACTIONS.VIEW), execute(networkController.list));

/**
 * @swagger
 * /api/v1/network/options:
 *   get:
 *     summary: Networks for a picker (id, name, status)
 *     tags: [Network]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Options } }
 */
router.get("/options", auth, allowed, can(ACTIONS.VIEW), execute(networkController.options));

/**
 * @swagger
 * /api/v1/network/get/{id}:
 *   get:
 *     summary: Get one network
 *     tags: [Network]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Network } }
 */
router.get("/get/:id", auth, allowed, can(ACTIONS.VIEW), execute(networkController.get));

/**
 * @swagger
 * /api/v1/network/add:
 *   post:
 *     summary: Create a network
 *     tags: [Network]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string }
 *               contactName: { type: string }
 *               contactEmail: { type: string }
 *               requireApproval: { type: boolean, default: true }
 *               notes: { type: string }
 *               status: { type: string, enum: [active, inactive] }
 *     responses: { 200: { description: Created } }
 */
router.post("/add", auth, allowed, can(ACTIONS.CREATE), execute(networkController.create));

/**
 * @swagger
 * /api/v1/network/update/{id}:
 *   patch:
 *     summary: Update a network's details
 *     tags: [Network]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Updated } }
 */
router.patch("/update/:id", auth, allowed, can(ACTIONS.UPDATE), execute(networkController.update));

/**
 * @swagger
 * /api/v1/network/status/{id}:
 *   patch:
 *     summary: Turn a network on or off (off blocks its logins and its campaigns' bidding)
 *     tags: [Network]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [status], properties: { status: { type: string, enum: [active, inactive] } } }
 *     responses: { 200: { description: Status changed } }
 */
router.patch("/status/:id", auth, allowed, can(ACTIONS.UPDATE), execute(networkController.changeStatus));

/**
 * @swagger
 * /api/v1/network/delete/{id}:
 *   delete:
 *     summary: Delete a network (refused while it has advertisers)
 *     tags: [Network]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Deleted } }
 */
router.delete("/delete/:id", auth, allowed, can(ACTIONS.DELETE), execute(networkController.remove));

module.exports = router;
