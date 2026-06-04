const express = require("express");
const campaignController = require("./controller");
const router = express.Router();
const execute = require("../../middleware/executor");
const {
  auth,
  accessAllowed,
  requirePermission,
} = require("../../middleware/index");
const { USER_TYPE } = require("./constant");
const { RESOURCES, ACTIONS } = require("../userConfig/constant");

/**
 * @swagger
 * tags:
 *   name: Campaign
 *   description: Campaign management
 */

/**
 * @swagger
 * /api/v1/campaign/add:
 *   post:
 *     summary: Create a campaign within the caller's organisation
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - type
 *             properties:
 *               title: { type: string }
 *               type: { type: string, enum: [mobile, ctv, web] }
 *               goal: { type: string }
 *               status: { type: string, enum: [active, paused] }
 *               currency: { type: string }
 *               bundleId: { type: string }
 *               appName: { type: string, description: "Required when type is mobile" }
 *               appOs: { type: string, enum: [ios, android], description: "Required when type is mobile" }
 *               appIconLink: { type: string, description: "External app icon URL; downloaded into our bucket, our bucket URL stored in appIconLink" }
 *               budget: { type: string }
 *               dailyBudget: { type: string }
 *               kpi: { type: string }
 *               isScheduling: { type: boolean }
 *               startDate: { type: string, format: date-time }
 *               endDate: { type: string, format: date-time }
 *               mmpPlatform: { type: string, enum: [appsflyer, adjust, branch, singular, apptrove, kochawa, appmetrica, affise] }
 *               ctaUrl: { type: string }
 *               vtaUrl: { type: string }
 *               eventDetails:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name: { type: string }
 *                     bidPrice: { type: string }
 *                     currency: { type: string }
 *               geo:
 *                 type: array
 *                 items: { type: string }
 *               isCustomTargating: { type: boolean }
 *               customTargating:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     country: { type: string }
 *                     state: { type: string }
 *                     city: { type: string }
 *               audienceTarget: { type: string, enum: [all, custom] }
 *               customAudienceIds:
 *                 type: array
 *                 items: { type: string }
 *               inventoryType: { type: string, enum: [programmatic, oem_premium_partners] }
 *               oemPremiumPartners:
 *                 type: array
 *                 items: { type: string }
 *               media:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     link: { type: string }
 *                     type: { type: string }
 *     responses:
 *       200:
 *         description: Campaign created successfully
 */
router.post(
  "/add",
  auth,
  accessAllowed([USER_TYPE.ADMIN, USER_TYPE.TEAM]),
  requirePermission(RESOURCES.CAMPAIGN, ACTIONS.CREATE),
  execute(campaignController.add)
);

/**
 * @swagger
 * /api/v1/campaign/list:
 *   get:
 *     summary: List campaigns within the caller's organisation
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [mobile, ctv, web] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, paused, deleted] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Campaigns fetched successfully
 */
router.get(
  "/list",
  auth,
  accessAllowed([USER_TYPE.ADMIN, USER_TYPE.TEAM]),
  requirePermission(RESOURCES.CAMPAIGN, ACTIONS.VIEW),
  execute(campaignController.list)
);

/**
 * @swagger
 * /api/v1/campaign/app-details:
 *   get:
 *     summary: Look up an app's store URL and details by its bundle id / package name (App Store or Play Store)
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: bundleId
 *         required: true
 *         schema: { type: string, example: "com.whatsapp" }
 *         description: App package name (Android) or bundle identifier (iOS)
 *       - in: query
 *         name: platform
 *         schema: { type: string, enum: [ios, android] }
 *         description: Optional. If omitted, the App Store is tried first, then the Play Store.
 *       - in: query
 *         name: country
 *         schema: { type: string, example: "gb" }
 *         description: Optional iOS storefront (ISO 2-letter code). If omitted, the busiest storefronts are swept (region-locked apps still resolve).
 *     responses:
 *       200:
 *         description: App details fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 platform: { type: string, enum: [ios, android] }
 *                 store: { type: string, enum: [app_store, play_store] }
 *                 country: { type: string, description: "Matched iOS storefront (null for Android)" }
 *                 bundleId: { type: string }
 *                 appId: { type: string }
 *                 title: { type: string }
 *                 url: { type: string }
 *                 iconUrl: { type: string }
 *                 developer: { type: string }
 *                 category: { type: string }
 *                 rating: { type: number }
 *                 ratingCount: { type: number }
 *                 price: { type: string }
 *                 version: { type: string }
 *                 description: { type: string }
 */
router.get(
  "/app-details",
  auth,
  accessAllowed([USER_TYPE.ADMIN, USER_TYPE.TEAM]),
  requirePermission(RESOURCES.CAMPAIGN, ACTIONS.VIEW),
  execute(campaignController.appDetails)
);

/**
 * @swagger
 * /api/v1/campaign/options:
 *   get:
 *     summary: List all campaigns in the caller's organisation as { id, value } pairs (for dropdowns)
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Campaign options fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   value: { type: string }
 */
router.get(
  "/options",
  auth,
  accessAllowed([USER_TYPE.ADMIN, USER_TYPE.TEAM]),
  requirePermission(RESOURCES.CAMPAIGN, ACTIONS.VIEW),
  execute(campaignController.options)
);

/**
 * @swagger
 * /api/v1/campaign/get/{id}:
 *   get:
 *     summary: Get a campaign by id within the caller's organisation
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Campaign fetched successfully
 */
router.get(
  "/get/:id",
  auth,
  accessAllowed([USER_TYPE.ADMIN, USER_TYPE.TEAM]),
  requirePermission(RESOURCES.CAMPAIGN, ACTIONS.VIEW),
  execute(campaignController.get)
);

/**
 * @swagger
 * /api/v1/campaign/update/{id}:
 *   patch:
 *     summary: Update a campaign within the caller's organisation
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Campaign updated successfully
 */
router.patch(
  "/update/:id",
  auth,
  accessAllowed([USER_TYPE.ADMIN, USER_TYPE.TEAM]),
  requirePermission(RESOURCES.CAMPAIGN, ACTIONS.UPDATE),
  execute(campaignController.update)
);

/**
 * @swagger
 * /api/v1/campaign/status/{id}:
 *   patch:
 *     summary: Change a campaign's status (active/paused) within the caller's organisation
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status: { type: string, enum: [active, paused] }
 *     responses:
 *       200:
 *         description: Campaign status updated successfully
 */
router.patch(
  "/status/:id",
  auth,
  accessAllowed([USER_TYPE.ADMIN, USER_TYPE.TEAM]),
  requirePermission(RESOURCES.CAMPAIGN, ACTIONS.UPDATE),
  execute(campaignController.changeStatus)
);

/**
 * @swagger
 * /api/v1/campaign/delete/{id}:
 *   delete:
 *     summary: Delete (soft) a campaign within the caller's organisation
 *     tags: [Campaign]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Campaign deleted successfully
 */
router.delete(
  "/delete/:id",
  auth,
  accessAllowed([USER_TYPE.ADMIN, USER_TYPE.TEAM]),
  requirePermission(RESOURCES.CAMPAIGN, ACTIONS.DELETE),
  execute(campaignController.remove)
);

module.exports = router;
