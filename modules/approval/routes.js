const express = require("express");
const approvalController = require("./controller");
const router = express.Router();
const execute = require("../../middleware/executor");
const { auth, accessAllowed, requirePermission } = require("../../middleware/index");
const { TYPE: USER_TYPE } = require("../user/constant");
const { RESOURCES, ACTIONS } = require("../userConfig/constant");

// Reviewing is the org's job: network users never reach the queue.
const orgOnly = accessAllowed([USER_TYPE.SUPER_ADMIN, USER_TYPE.ADMIN, USER_TYPE.TEAM]);
const anyone = accessAllowed([
  USER_TYPE.SUPER_ADMIN, USER_TYPE.ADMIN, USER_TYPE.TEAM, USER_TYPE.NETWORK_ADMIN, USER_TYPE.NETWORK_TEAM,
]);
const canApprove = requirePermission(RESOURCES.CAMPAIGN, ACTIONS.APPROVE);

/**
 * @swagger
 * tags:
 *   name: Approval
 *   description: The org's approval of campaigns, line items and creatives its networks create or
 *     materially change. Only approved items bid, and only after the super admin turns bidding on.
 */

/**
 * @swagger
 * /api/v1/approval/queue:
 *   get:
 *     summary: Items by approval status (default pending), grouped by campaign
 *     tags: [Approval]
 *     security: [ { bearerAuth: [] } ]
 *     parameters:
 *       - { in: query, name: status, schema: { type: string, enum: [pending, approved, rejected] } }
 *     responses: { 200: { description: Groups } }
 */
router.get("/queue", auth, orgOnly, canApprove, execute(approvalController.queue));

/**
 * @swagger
 * /api/v1/approval/count:
 *   get:
 *     summary: How many items wait for approval
 *     tags: [Approval]
 *     security: [ { bearerAuth: [] } ]
 *     responses: { 200: { description: Counts } }
 */
router.get("/count", auth, orgOnly, canApprove, execute(approvalController.count));

/**
 * @swagger
 * /api/v1/approval/review:
 *   post:
 *     summary: Approve or reject items (a note is required to reject)
 *     tags: [Approval]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [items, decision]
 *             properties:
 *               items:
 *                 type: array
 *                 items: { type: object, properties: { kind: { type: string, enum: [campaign, lineItem, creative] }, id: { type: string } } }
 *               decision: { type: string, enum: [approve, reject] }
 *               note: { type: string }
 *     responses: { 200: { description: Reviewed } }
 */
router.post("/review", auth, orgOnly, canApprove, execute(approvalController.review));

/**
 * @swagger
 * /api/v1/approval/resubmit:
 *   post:
 *     summary: Send a rejected item back for approval
 *     tags: [Approval]
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { type: object, required: [kind, id], properties: { kind: { type: string, enum: [campaign, lineItem, creative] }, id: { type: string } } }
 *     responses: { 200: { description: Resubmitted } }
 */
router.post(
  "/resubmit",
  auth,
  anyone,
  requirePermission(RESOURCES.CAMPAIGN, ACTIONS.UPDATE),
  execute(approvalController.resubmit)
);

module.exports = router;
