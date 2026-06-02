const express = require('express');
const orgController = require("./controller");
const router = express.Router();
const execute = require('../../middleware/executor');
const { auth, executor, accessAllowed, imageUpload } = require('../../middleware/index');
const { TYPE } = require("../user/constant");

/**
 * @swagger
 * tags:
 *   name: Organization
 *   description: Organization-setting-update
 */

/**
 * @swagger
 * /api/v1/org/update:
 *   post:
 *     summary: Update org config
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               logoUrl:
 *                 type: string
 *               logoUrlId:
 *                 type: string
 *               themeColor:
 *                 type: string
 * 
 *     responses:
 *       200:
 *         description: Org config updated successfully
 */
router.post("/update", auth, accessAllowed([TYPE.ADMIN, TYPE.TEAM]), execute(orgController.update));

/**
 * @swagger
 * /api/v1/org/get:
 *   get:
 *     summary: get org config
 *     tags: [Organization]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: org config fetched successfully
 */
router.get("/get", auth, accessAllowed([TYPE.ADMIN, TYPE.TEAM]), execute(orgController.get));

/**
 * @swagger
 * /api/v1/org/config:
 *   get:
 *     summary: get org open end point config
 *     tags: [Organization]
 *     responses:
 *       200:
 *         description: org config fetched successfully
 */
router.get("/config", execute(orgController.getOrgConfig));


module.exports = router;
