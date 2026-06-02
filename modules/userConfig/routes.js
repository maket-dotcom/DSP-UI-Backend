const express = require("express");
const userConfigController = require("./controller");
const router = express.Router();
const execute = require("../../middleware/executor");
const { auth, accessAllowed } = require("../../middleware/index");
const { TYPE } = require("../user/constant");

/**
 * @swagger
 * tags:
 *   name: UserConfig
 *   description: Per-user permission configuration
 */

/**
 * @swagger
 * /api/v1/user-config/upsert:
 *   post:
 *     summary: Create or update a user's permission config
 *     tags: [UserConfig]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - permissions
 *             properties:
 *               userId:
 *                 type: string
 *               permissions:
 *                 type: object
 *                 example: { campaign: ["view", "create"], report: ["view"] }
 *               status:
 *                 type: string
 *                 enum: [active, inactive]
 *     responses:
 *       200:
 *         description: User permission config saved successfully
 */
router.post(
  "/upsert",
  auth,
  accessAllowed([TYPE.SUPER_ADMIN, TYPE.ADMIN]),
  execute(userConfigController.upsert)
);

/**
 * @swagger
 * /api/v1/user-config/get:
 *   get:
 *     summary: Get a user's permission config
 *     tags: [UserConfig]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User permission config fetched successfully
 */
router.get(
  "/get",
  auth,
  accessAllowed([TYPE.SUPER_ADMIN, TYPE.ADMIN]),
  execute(userConfigController.getByUser)
);

/**
 * @swagger
 * /api/v1/user-config/me:
 *   get:
 *     summary: Get the authenticated user's own permission config
 *     tags: [UserConfig]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User permission config fetched successfully
 */
router.get("/me", auth, execute(userConfigController.me));

/**
 * @swagger
 * /api/v1/user-config/remove:
 *   post:
 *     summary: Remove a user's permission config
 *     tags: [UserConfig]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *             properties:
 *               userId:
 *                 type: string
 *     responses:
 *       200:
 *         description: User permission config removed successfully
 */
router.post(
  "/remove",
  auth,
  accessAllowed([TYPE.SUPER_ADMIN, TYPE.ADMIN]),
  execute(userConfigController.remove)
);

module.exports = router;
