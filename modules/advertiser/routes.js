const express = require("express");
const advertiserController = require("./controller");
const router = express.Router();
const execute = require("../../middleware/executor");
const { auth, accessAllowed, requirePermission } = require("../../middleware/index");
const { TYPE: USER_TYPE } = require("../user/constant");
const { RESOURCES, ACTIONS } = require("../userConfig/constant");

// Advertisers are part of campaign setup, so they use the CAMPAIGN permission:
// team members who can manage campaigns can manage advertisers.
const allowed = accessAllowed([USER_TYPE.SUPER_ADMIN, USER_TYPE.ADMIN, USER_TYPE.TEAM]);
const can = (action) => requirePermission(RESOURCES.CAMPAIGN, action);

/**
 * @swagger
 * tags:
 *   name: Advertiser
 *   description: Advertisers (brands / app owners) within the caller's organization.
 *     Organization → Advertiser → Campaign → Line Item.
 */

/**
 * @swagger
 * /api/v1/advertiser/list:
 *   get:
 *     summary: List advertisers (paginated, with campaign counts)
 *     tags: [Advertiser]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer } }
 *       - { in: query, name: limit, schema: { type: integer } }
 *       - { in: query, name: status, schema: { type: string, enum: [active, paused] } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses: { 200: { description: Advertisers } }
 */
router.get("/list", auth, allowed, can(ACTIONS.VIEW), execute(advertiserController.list));

/**
 * @swagger
 * /api/v1/advertiser/options:
 *   get:
 *     summary: Advertisers as { id, value } for dropdowns
 *     tags: [Advertiser]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Options } }
 */
router.get("/options", auth, allowed, can(ACTIONS.VIEW), execute(advertiserController.options));

/**
 * @swagger
 * /api/v1/advertiser/categories:
 *   get:
 *     summary: IAB tier-1 advertiser categories
 *     tags: [Advertiser]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Categories } }
 */
router.get("/categories", auth, allowed, can(ACTIONS.VIEW), execute(advertiserController.categories));

/**
 * @swagger
 * /api/v1/advertiser/get/{id}:
 *   get:
 *     summary: Get one advertiser
 *     tags: [Advertiser]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Advertiser } }
 */
router.get("/get/:id", auth, allowed, can(ACTIONS.VIEW), execute(advertiserController.get));

/**
 * @swagger
 * /api/v1/advertiser/add:
 *   post:
 *     summary: Create an advertiser (name, domain, category required)
 *     tags: [Advertiser]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Created } }
 */
router.post("/add", auth, allowed, can(ACTIONS.CREATE), execute(advertiserController.create));

/**
 * @swagger
 * /api/v1/advertiser/update/{id}:
 *   patch:
 *     summary: Update an advertiser
 *     tags: [Advertiser]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Updated } }
 */
router.patch("/update/:id", auth, allowed, can(ACTIONS.UPDATE), execute(advertiserController.update));

/**
 * @swagger
 * /api/v1/advertiser/status/{id}:
 *   patch:
 *     summary: Activate / pause an advertiser (pausing stops all its campaigns)
 *     tags: [Advertiser]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Status changed } }
 */
router.patch("/status/:id", auth, allowed, can(ACTIONS.UPDATE), execute(advertiserController.changeStatus));

/**
 * @swagger
 * /api/v1/advertiser/delete/{id}:
 *   delete:
 *     summary: Delete an advertiser (only when it has no campaigns)
 *     tags: [Advertiser]
 *     security: [ { bearerAuth: [] } ]
 *     parameters: [ { in: path, name: id, required: true, schema: { type: string } } ]
 *     responses: { 200: { description: Deleted } }
 */
router.delete("/delete/:id", auth, allowed, can(ACTIONS.DELETE), execute(advertiserController.remove));

module.exports = router;
