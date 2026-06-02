const express = require("express");
const userController = require("./controller");
const router = express.Router();
const execute = require("../../middleware/executor");
const {
  auth,
  authSuperAdmin,
  executor,
  accessAllowed,
  imageUpload,
  requirePermission,
} = require("../../middleware/index");
const { TYPE } = require("./constant");
const { RESOURCES, ACTIONS } = require("../userConfig/constant");

/**
 * @swagger
 * tags:
 *   name: User
 *   description: User management
 */

/**
 * @swagger
 * /api/v1/user/login:
 *   post:
 *     summary: Org-scoped login for admin/team members
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orgId
 *               - email
 *               - password
 *             properties:
 *               orgId:
 *                 type: string
 *                 description: The organisation the user belongs to
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged in successfully (returns bearer token)
 */
router.post("/login", execute(userController.login));

/**
 * @swagger
 * /api/v1/user/super-admin/login:
 *   post:
 *     summary: Dedicated super-admin login (not org-scoped)
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged in successfully (returns bearer token)
 */
router.post("/super-admin/login", execute(userController.superAdminLogin));

/**
 * @swagger
 * /api/v1/user/super-admin/create-org:
 *   post:
 *     summary: (super-admin) Create an organisation and its admin user
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - orgName
 *               - name
 *               - email
 *               - mobile
 *               - password
 *             properties:
 *               orgName:
 *                 type: string
 *               orgType:
 *                 type: string
 *               timezone:
 *                 type: string
 *               subdomain:
 *                 type: string
 *               name:
 *                 type: string
 *                 description: Admin's name
 *               email:
 *                 type: string
 *                 description: Admin's email
 *               mobile:
 *                 type: string
 *                 description: Admin's mobile
 *               password:
 *                 type: string
 *                 description: Admin's password
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Organisation and admin created successfully
 */
router.post(
  "/super-admin/create-org",
  authSuperAdmin,
  execute(userController.createOrgWithAdmin)
);

/**
 * @swagger
 * /api/v1/user/create:
 *   post:
 *     summary: Create a user within the caller's organisation
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - mobile
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               mobile:
 *                 type: string
 *               password:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [admin, team]
 *                 default: team
 *               gender:
 *                 type: string
 *               age:
 *                 type: number
 *               address:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, deleted]
 *     responses:
 *       200:
 *         description: User created successfully
 */
router.post(
  "/create",
  auth,
  accessAllowed([TYPE.ADMIN, TYPE.TEAM]),
  requirePermission(RESOURCES.USER, ACTIONS.CREATE),
  execute(userController.createUser)
);

/**
 * @swagger
 * /api/v1/user/list:
 *   get:
 *     summary: List users within the caller's organisation
 *     tags: [User]
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
 *         schema: { type: string, enum: [admin, team] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive, deleted] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Users fetched successfully
 */
router.get(
  "/list",
  auth,
  accessAllowed([TYPE.ADMIN, TYPE.TEAM]),
  requirePermission(RESOURCES.USER, ACTIONS.VIEW),
  execute(userController.listUsers)
);

/**
 * @swagger
 * /api/v1/user/get/{id}:
 *   get:
 *     summary: Get a user by id within the caller's organisation
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User fetched successfully
 */
router.get(
  "/get/:id",
  auth,
  accessAllowed([TYPE.ADMIN, TYPE.TEAM]),
  requirePermission(RESOURCES.USER, ACTIONS.VIEW),
  execute(userController.getUser)
);

/**
 * @swagger
 * /api/v1/user/update/{id}:
 *   patch:
 *     summary: Update a user within the caller's organisation
 *     tags: [User]
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
 *             properties:
 *               name:
 *                 type: string
 *               mobile:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [admin, team]
 *               gender:
 *                 type: string
 *               age:
 *                 type: number
 *               address:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [active, inactive, deleted]
 *     responses:
 *       200:
 *         description: User updated successfully
 */
router.patch(
  "/update/:id",
  auth,
  accessAllowed([TYPE.ADMIN, TYPE.TEAM]),
  requirePermission(RESOURCES.USER, ACTIONS.UPDATE),
  execute(userController.updateUser)
);

/**
 * @swagger
 * /api/v1/user/delete/{id}:
 *   delete:
 *     summary: Delete (soft) a user within the caller's organisation
 *     tags: [User]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User deleted successfully
 */
router.delete(
  "/delete/:id",
  auth,
  accessAllowed([TYPE.ADMIN, TYPE.TEAM]),
  requirePermission(RESOURCES.USER, ACTIONS.DELETE),
  execute(userController.deleteUser)
);

module.exports = router;
