const auth = require('./auth');
const authSuperAdmin = require('./authSuperAdmin');
const executor = require('./executor');
const accessAllowed = require('./accessAllowed');
const validateInfo = require('./validator');
const imageUpload = require('./multer');
const uploadMultipleFile = require('./uploadMultipleFile');
const authDeveloper = require('./auth-developer');
const gzipCompression = require('./gzipCompression');
const requirePermission = require('./requirePermission');

module.exports = {
    auth,
    authSuperAdmin,
    executor,
    accessAllowed,
    validateInfo,
    imageUpload,
    uploadMultipleFile,
    authDeveloper,
    gzipCompression,
    requirePermission
}