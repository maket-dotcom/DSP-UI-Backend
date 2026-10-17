const express = require("express");
const creativeController = require("./controller");
const router = express.Router();
const execute = require("../../middleware/executor");
const { auth, accessAllowed, requirePermission } = require("../../middleware/index");
const { TYPE: USER_TYPE } = require("../user/constant");
const { RESOURCES, ACTIONS } = require("../userConfig/constant");

// Creatives are part of campaign setup → CAMPAIGN permission.
const allowed = accessAllowed([USER_TYPE.SUPER_ADMIN, USER_TYPE.ADMIN, USER_TYPE.TEAM, USER_TYPE.NETWORK_ADMIN, USER_TYPE.NETWORK_TEAM]);
const can = (action) => requirePermission(RESOURCES.CAMPAIGN, action);

/**
 * @swagger
 * tags:
 *   name: Creative
 *   description: Advertiser-level creative library; line items attach creatives by id.
 */

/**
 * @swagger
 * /api/v1/creative/list:
 *   get:
 *     summary: List an advertiser's creatives
 *     tags: [Creative]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: advertiserId, required: true, schema: { type: string } }
 *       - { in: query, name: type, schema: { type: string, enum: [image, video] } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses: { 200: { description: Creatives } }
 */
router.get("/list", auth, allowed, can(ACTIONS.VIEW), execute(creativeController.list));

/**
 * @swagger
 * /api/v1/creative/add:
 *   post:
 *     summary: Create a creative from an upload (mediaId) or a VAST tag
 *     tags: [Creative]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Created } }
 */
router.post("/add", auth, allowed, can(ACTIONS.CREATE), execute(creativeController.create));

/**
 * @swagger
 * /api/v1/creative/update/{id}:
 *   patch:
 *     summary: Rename, pause, or set a click URL override
 *     tags: [Creative]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Updated } }
 */
router.patch("/update/:id", auth, allowed, can(ACTIONS.UPDATE), execute(creativeController.update));

/**
 * @swagger
 * /api/v1/creative/delete/{id}:
 *   delete:
 *     summary: Delete a creative (refused while a line item uses it)
 *     tags: [Creative]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Deleted } }
 */
router.delete("/delete/:id", auth, allowed, can(ACTIONS.DELETE), execute(creativeController.remove));

module.exports = router;
