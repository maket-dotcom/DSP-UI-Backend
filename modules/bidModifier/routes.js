const express = require("express");
const bidModifierController = require("./controller");
const router = express.Router();
const execute = require("../../middleware/executor");
const { auth, accessAllowed, requirePermission } = require("../../middleware/index");
const { TYPE: USER_TYPE } = require("../user/constant");
const { RESOURCES, ACTIONS } = require("../userConfig/constant");

// Bid modifiers are part of campaign setup → CAMPAIGN permission.
const allowed = accessAllowed([USER_TYPE.SUPER_ADMIN, USER_TYPE.ADMIN, USER_TYPE.TEAM]);
const can = (action) => requirePermission(RESOURCES.CAMPAIGN, action);

/**
 * @swagger
 * tags:
 *   name: BidModifier
 *   description: Reusable bid adjustments per advertiser. Ordered terms ("bundle is X → ×1.2");
 *     the first term whose conditions all match sets the multiplier (0 = don't bid), then the
 *     bid is held within min / max bid.
 */

/**
 * @swagger
 * /api/v1/bid-modifier/fields:
 *   get:
 *     summary: Request attributes a condition can test
 *     tags: [BidModifier]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Fields } }
 */
router.get("/fields", auth, allowed, can(ACTIONS.VIEW), execute(bidModifierController.fields));

/**
 * @swagger
 * /api/v1/bid-modifier/list:
 *   get:
 *     summary: List bid modifiers (paginated, with line item usage)
 *     tags: [BidModifier]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: advertiserId, schema: { type: string } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses: { 200: { description: Bid modifiers } }
 */
router.get("/list", auth, allowed, can(ACTIONS.VIEW), execute(bidModifierController.list));

/**
 * @swagger
 * /api/v1/bid-modifier/options:
 *   get:
 *     summary: An advertiser's bid modifiers for a picker
 *     tags: [BidModifier]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: query, name: advertiserId, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Options } }
 */
router.get("/options", auth, allowed, can(ACTIONS.VIEW), execute(bidModifierController.options));

/**
 * @swagger
 * /api/v1/bid-modifier/get/{id}:
 *   get:
 *     summary: Get one bid modifier
 *     tags: [BidModifier]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Bid modifier } }
 */
router.get("/get/:id", auth, allowed, can(ACTIONS.VIEW), execute(bidModifierController.get));

/**
 * @swagger
 * /api/v1/bid-modifier/add:
 *   post:
 *     summary: Create a bid modifier
 *     tags: [BidModifier]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Created } }
 */
router.post("/add", auth, allowed, can(ACTIONS.CREATE), execute(bidModifierController.create));

/**
 * @swagger
 * /api/v1/bid-modifier/update/{id}:
 *   patch:
 *     summary: Update a bid modifier (every line item using it changes on the next engine refresh)
 *     tags: [BidModifier]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Updated } }
 */
router.patch("/update/:id", auth, allowed, can(ACTIONS.UPDATE), execute(bidModifierController.update));

/**
 * @swagger
 * /api/v1/bid-modifier/delete/{id}:
 *   delete:
 *     summary: Delete a bid modifier (only when no line item uses it)
 *     tags: [BidModifier]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Deleted } }
 */
router.delete("/delete/:id", auth, allowed, can(ACTIONS.DELETE), execute(bidModifierController.remove));

module.exports = router;
