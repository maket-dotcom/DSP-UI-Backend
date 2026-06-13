const express = require("express");
const bidConfigController = require("./controller");
const router = express.Router();
const execute = require("../../middleware/executor");
const { authSuperAdmin } = require("../../middleware/index");

// Every bid-config route is super-admin only.
router.use(authSuperAdmin);

/**
 * @swagger
 * tags:
 *   name: BidConfig
 *   description: Global campaign bid configuration (super admin only)
 */

/**
 * @swagger
 * /api/v1/bid-config/get:
 *   get:
 *     summary: Get the global bid configuration (singleton)
 *     tags: [BidConfig]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bid configuration fetched successfully
 */
router.get("/get", execute(bidConfigController.get));

/**
 * @swagger
 * /api/v1/bid-config/upsert:
 *   post:
 *     summary: Create or replace the global bid configuration
 *     tags: [BidConfig]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               status: { type: string, enum: [active, inactive] }
 *               defaultBidPrice: { type: number, nullable: true }
 *               defaultCurrency: { type: string, example: USD }
 *               campaignBids:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [campaignId, bidPrice]
 *                   properties:
 *                     campaignId: { type: string }
 *                     campaignTitle: { type: string }
 *                     bidPrice: { type: number, example: 0.19 }
 *                     currency: { type: string, example: USD }
 *                     enabled: { type: boolean }
 *                     maxBidPrice: { type: number, nullable: true }
 *                     note: { type: string }
 *     responses:
 *       200:
 *         description: Bid configuration saved successfully
 */
router.post("/upsert", execute(bidConfigController.upsert));

/**
 * @swagger
 * /api/v1/bid-config/campaign/upsert:
 *   post:
 *     summary: Add or update a single campaign's bid
 *     tags: [BidConfig]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [campaignId, bidPrice]
 *             properties:
 *               campaignId: { type: string }
 *               campaignTitle: { type: string }
 *               bidPrice: { type: number, example: 0.19 }
 *               currency: { type: string, example: USD }
 *               enabled: { type: boolean }
 *               maxBidPrice: { type: number, nullable: true }
 *               note: { type: string }
 *     responses:
 *       200:
 *         description: Campaign bid saved successfully
 */
router.post("/campaign/upsert", execute(bidConfigController.upsertCampaign));

/**
 * @swagger
 * /api/v1/bid-config/campaign/remove:
 *   post:
 *     summary: Remove a single campaign's bid
 *     tags: [BidConfig]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [campaignId]
 *             properties:
 *               campaignId: { type: string }
 *     responses:
 *       200:
 *         description: Campaign bid removed successfully
 */
router.post("/campaign/remove", execute(bidConfigController.removeCampaign));

module.exports = router;
