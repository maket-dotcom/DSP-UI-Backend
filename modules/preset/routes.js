const express = require("express");
const presetController = require("./controller");
const router = express.Router();
const execute = require("../../middleware/executor");
const { auth, accessAllowed, requirePermission } = require("../../middleware/index");
const { TYPE: USER_TYPE } = require("../user/constant");
const { RESOURCES, ACTIONS } = require("../userConfig/constant");

// Presets are part of campaign setup → CAMPAIGN permission.
const allowed = accessAllowed([USER_TYPE.SUPER_ADMIN, USER_TYPE.ADMIN, USER_TYPE.TEAM, USER_TYPE.NETWORK_ADMIN, USER_TYPE.NETWORK_TEAM]);
const can = (action) => requirePermission(RESOURCES.CAMPAIGN, action);

/**
 * @swagger
 * tags:
 *   name: Preset
 *   description: Saved settings that prefill a new campaign, line item or line item targeting.
 *     Org-wide (advertiserId null) or per advertiser.
 */

/**
 * @swagger
 * /api/v1/preset/list:
 *   get:
 *     summary: List presets (paginated, without their settings)
 *     tags: [Preset]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: kind, schema: { type: string, enum: [campaign, lineItem, targeting] } }
 *       - { in: query, name: advertiserId, schema: { type: string } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses: { 200: { description: Presets } }
 */
router.get("/list", auth, allowed, can(ACTIONS.VIEW), execute(presetController.list));

/**
 * @swagger
 * /api/v1/preset/options:
 *   get:
 *     summary: Presets of a kind usable for an advertiser (its own + org-wide)
 *     tags: [Preset]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: kind, required: true, schema: { type: string, enum: [campaign, lineItem, targeting] } }
 *       - { in: query, name: advertiserId, schema: { type: string } }
 *     responses: { 200: { description: Options } }
 */
router.get("/options", auth, allowed, can(ACTIONS.VIEW), execute(presetController.options));

/**
 * @swagger
 * /api/v1/preset/get/{id}:
 *   get:
 *     summary: Get one preset with its settings
 *     tags: [Preset]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Preset } }
 */
router.get("/get/:id", auth, allowed, can(ACTIONS.VIEW), execute(presetController.get));

/**
 * @swagger
 * /api/v1/preset/add:
 *   post:
 *     summary: Save a preset (settings are validated like the matching form)
 *     tags: [Preset]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Created } }
 */
router.post("/add", auth, allowed, can(ACTIONS.CREATE), execute(presetController.create));

/**
 * @swagger
 * /api/v1/preset/update/{id}:
 *   patch:
 *     summary: Rename a preset or replace its settings
 *     tags: [Preset]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Updated } }
 */
router.patch("/update/:id", auth, allowed, can(ACTIONS.UPDATE), execute(presetController.update));

/**
 * @swagger
 * /api/v1/preset/delete/{id}:
 *   delete:
 *     summary: Delete a preset (not while an advertiser uses it as a default)
 *     tags: [Preset]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Deleted } }
 */
router.delete("/delete/:id", auth, allowed, can(ACTIONS.DELETE), execute(presetController.remove));

module.exports = router;
