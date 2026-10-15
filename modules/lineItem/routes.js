const express = require("express");
const lineItemController = require("./controller");
const router = express.Router();
const execute = require("../../middleware/executor");
const { auth, accessAllowed, requirePermission } = require("../../middleware/index");
const { TYPE: USER_TYPE } = require("../user/constant");
const { RESOURCES, ACTIONS } = require("../userConfig/constant");

// Line items are part of a campaign → CAMPAIGN permission.
const allowed = accessAllowed([USER_TYPE.SUPER_ADMIN, USER_TYPE.ADMIN, USER_TYPE.TEAM]);
const can = (action) => requirePermission(RESOURCES.CAMPAIGN, action);

/**
 * @swagger
 * tags:
 *   name: LineItem
 *   description: Line items — one way of buying a campaign (format, flight, budget, bid,
 *     targeting, creatives). The bid engine bids per line item.
 */

/**
 * @swagger
 * /api/v1/line-item/list:
 *   get:
 *     summary: List a campaign's line items
 *     tags: [LineItem]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: campaignId, required: true, schema: { type: string } }
 *       - { in: query, name: status, schema: { type: string, enum: [active, paused] } }
 *     responses: { 200: { description: Line items } }
 */
router.get("/list", auth, allowed, can(ACTIONS.VIEW), execute(lineItemController.list));

/**
 * @swagger
 * /api/v1/line-item/targeting-options:
 *   get:
 *     summary: Choices for the targeting pickers (supply partners + zones, campaigns for
 *       retargeting, device types)
 *     tags: [LineItem]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Options } }
 */
router.get("/targeting-options", auth, allowed, can(ACTIONS.VIEW), execute(lineItemController.targetingOptions));

/**
 * @swagger
 * /api/v1/line-item/get/{id}:
 *   get:
 *     summary: Get one line item
 *     tags: [LineItem]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Line item } }
 */
router.get("/get/:id", auth, allowed, can(ACTIONS.VIEW), execute(lineItemController.get));

/**
 * @swagger
 * /api/v1/line-item/add:
 *   post:
 *     summary: Create a line item (dates and budgets must fit inside the campaign)
 *     tags: [LineItem]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Created } }
 */
router.post("/add", auth, allowed, can(ACTIONS.CREATE), execute(lineItemController.create));

/**
 * @swagger
 * /api/v1/line-item/update/{id}:
 *   patch:
 *     summary: Update a line item
 *     tags: [LineItem]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Updated } }
 */
router.patch("/update/:id", auth, allowed, can(ACTIONS.UPDATE), execute(lineItemController.update));

/**
 * @swagger
 * /api/v1/line-item/status/{id}:
 *   patch:
 *     summary: Activate / pause a line item (activating needs at least one creative)
 *     tags: [LineItem]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Status changed } }
 */
router.patch("/status/:id", auth, allowed, can(ACTIONS.UPDATE), execute(lineItemController.changeStatus));

/**
 * @swagger
 * /api/v1/line-item/delete/{id}:
 *   delete:
 *     summary: Delete a line item (soft delete)
 *     tags: [LineItem]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Deleted } }
 */
router.delete("/delete/:id", auth, allowed, can(ACTIONS.DELETE), execute(lineItemController.remove));

module.exports = router;
