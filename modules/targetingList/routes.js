const express = require("express");
const targetingListController = require("./controller");
const router = express.Router();
const execute = require("../../middleware/executor");
const { auth, accessAllowed, requirePermission } = require("../../middleware/index");
const { TYPE: USER_TYPE } = require("../user/constant");
const { RESOURCES, ACTIONS } = require("../userConfig/constant");

// Lists are part of campaign setup → CAMPAIGN permission.
const allowed = accessAllowed([USER_TYPE.SUPER_ADMIN, USER_TYPE.ADMIN, USER_TYPE.TEAM, USER_TYPE.NETWORK_ADMIN, USER_TYPE.NETWORK_TEAM]);
const can = (action) => requirePermission(RESOURCES.CAMPAIGN, action);

/**
 * @swagger
 * tags:
 *   name: TargetingList
 *   description: Reusable targeting lists (app bundles / site domains) that line items
 *     include or exclude by reference.
 */

/**
 * @swagger
 * /api/v1/targeting-list/list:
 *   get:
 *     summary: List targeting lists (paginated, with entry and line item counts)
 *     tags: [TargetingList]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: kind, schema: { type: string, enum: [bundle, zip, deal] } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses: { 200: { description: Lists } }
 */
router.get("/list", auth, allowed, can(ACTIONS.VIEW), execute(targetingListController.list));

/**
 * @swagger
 * /api/v1/targeting-list/options:
 *   get:
 *     summary: Lists for a picker (id, name, entry count)
 *     tags: [TargetingList]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: query, name: kind, schema: { type: string, enum: [bundle, zip, deal] } } ]
 *     responses: { 200: { description: Options } }
 */
router.get("/options", auth, allowed, can(ACTIONS.VIEW), execute(targetingListController.options));

/**
 * @swagger
 * /api/v1/targeting-list/get/{id}:
 *   get:
 *     summary: Get one list with its values
 *     tags: [TargetingList]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: List } }
 */
router.get("/get/:id", auth, allowed, can(ACTIONS.VIEW), execute(targetingListController.get));

/**
 * @swagger
 * /api/v1/targeting-list/add:
 *   post:
 *     summary: Create a list (values are trimmed, lower-cased, de-duplicated)
 *     tags: [TargetingList]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Created } }
 */
router.post("/add", auth, allowed, can(ACTIONS.CREATE), execute(targetingListController.create));

/**
 * @swagger
 * /api/v1/targeting-list/update/{id}:
 *   patch:
 *     summary: Rename a list or replace its values
 *     tags: [TargetingList]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Updated } }
 */
router.patch("/update/:id", auth, allowed, can(ACTIONS.UPDATE), execute(targetingListController.update));

/**
 * @swagger
 * /api/v1/targeting-list/delete/{id}:
 *   delete:
 *     summary: Delete a list (only when no line item uses it)
 *     tags: [TargetingList]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Deleted } }
 */
router.delete("/delete/:id", auth, allowed, can(ACTIONS.DELETE), execute(targetingListController.remove));

module.exports = router;
