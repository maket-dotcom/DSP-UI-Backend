const express = require('express');
const router = express.Router();
const execute = require('../../middleware/executor');
const {
  auth,
  accessAllowed,
  imageUpload,
  requirePermission,
} = require('../../middleware/index');
const { TYPE } = require("./constant");
const { RESOURCES, ACTIONS } = require("../userConfig/constant");
const mediaController = require('./controller');

/**
 * @swagger
 * tags:
 *   name: Media
 *   description: Media management
 */

/**
 * @swagger
 * /api/v1/media/add:
 *   post:
 *     summary: Add a new media (file uploaded to Google Cloud Storage)
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: The name of the media
 *               type:
 *                 type: string
 *                 description: Upload category (profile|product|template|campaign|note)
 *               parentId:
 *                 type: string
 *                 description: Optional parent id (e.g. productId for a template)
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: The media file to upload
 *     responses:
 *       200:
 *         description: Media added successfully
 */
router.post(
  "/add",
  auth,
  accessAllowed([TYPE.SUPER_ADMIN, TYPE.ADMIN, TYPE.TEAM]),
  requirePermission(RESOURCES.MEDIA, ACTIONS.CREATE),
  imageUpload(['image']),
  execute(mediaController.add)
);

/**
 * @swagger
 * /api/v1/media/delete-many:
 *   post:
 *     summary: Remove multiple medias by ID
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: medias deleted successfully
 */
router.post(
  "/delete-many",
  auth,
  accessAllowed([TYPE.SUPER_ADMIN, TYPE.ADMIN, TYPE.TEAM]),
  requirePermission(RESOURCES.MEDIA, ACTIONS.DELETE),
  execute(mediaController.removeMany)
);

/**
 * @swagger
 * /api/v1/media/delete/{id}:
 *   delete:
 *     summary: Remove a media by ID
 *     tags: [Media]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Media deleted successfully
 */
router.delete(
  "/delete/:id",
  auth,
  accessAllowed([TYPE.SUPER_ADMIN, TYPE.ADMIN, TYPE.TEAM]),
  requirePermission(RESOURCES.MEDIA, ACTIONS.DELETE),
  execute(mediaController.remove)
);

module.exports = router;
