const express = require("express");
const deliveryModifierController = require("./controller");
const router = express.Router();
const execute = require("../../middleware/executor");
const { auth, accessAllowed, requirePermission } = require("../../middleware/index");
const { TYPE: USER_TYPE } = require("../user/constant");
const { RESOURCES, ACTIONS } = require("../userConfig/constant");

// Delivery modifiers are part of campaign setup → CAMPAIGN permission.
const allowed = accessAllowed([USER_TYPE.SUPER_ADMIN, USER_TYPE.ADMIN, USER_TYPE.TEAM]);
const can = (action) => requirePermission(RESOURCES.CAMPAIGN, action);

/**
 * @swagger
 * tags:
 *   name: DeliveryModifier
 *   description: Reusable delivery rules per advertiser. Ordered terms ("bundle is X → bid on
 *     30% of requests"); the first term whose conditions all match sets the share. Condition
 *     fields are listed by /api/v1/bid-modifier/fields.
 */

/**
 * @swagger
 * /api/v1/delivery-modifier/list:
 *   get:
 *     summary: List delivery modifiers (paginated, with line item usage)
 *     tags: [DeliveryModifier]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: advertiserId, schema: { type: string } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses: { 200: { description: Delivery modifiers } }
 */
router.get("/list", auth, allowed, can(ACTIONS.VIEW), execute(deliveryModifierController.list));

/**
 * @swagger
 * /api/v1/delivery-modifier/options:
 *   get:
 *     summary: An advertiser's delivery modifiers for a picker
 *     tags: [DeliveryModifier]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: query, name: advertiserId, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Options } }
 */
router.get("/options", auth, allowed, can(ACTIONS.VIEW), execute(deliveryModifierController.options));

/**
 * @swagger
 * /api/v1/delivery-modifier/get/{id}:
 *   get:
 *     summary: Get one delivery modifier
 *     tags: [DeliveryModifier]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Delivery modifier } }
 */
router.get("/get/:id", auth, allowed, can(ACTIONS.VIEW), execute(deliveryModifierController.get));

/**
 * @swagger
 * /api/v1/delivery-modifier/add:
 *   post:
 *     summary: Create a delivery modifier
 *     tags: [DeliveryModifier]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Created } }
 */
router.post("/add", auth, allowed, can(ACTIONS.CREATE), execute(deliveryModifierController.create));

/**
 * @swagger
 * /api/v1/delivery-modifier/update/{id}:
 *   patch:
 *     summary: Update a delivery modifier (every line item using it changes on the next engine refresh)
 *     tags: [DeliveryModifier]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Updated } }
 */
router.patch("/update/:id", auth, allowed, can(ACTIONS.UPDATE), execute(deliveryModifierController.update));

/**
 * @swagger
 * /api/v1/delivery-modifier/delete/{id}:
 *   delete:
 *     summary: Delete a delivery modifier (only when no line item uses it)
 *     tags: [DeliveryModifier]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Deleted } }
 */
router.delete("/delete/:id", auth, allowed, can(ACTIONS.DELETE), execute(deliveryModifierController.remove));

module.exports = router;
