const multer = require('multer');
const _ = require('lodash');
const path = require('path');
const fs = require('fs');

// Disk storage configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Ensure this folder exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

// Multer configuration
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB limit
  }
});

/**
 * Middleware to upload multiple fields (all using array uploads)
 * Example usage: uploadMultipleFile([{ name: 'files' }, { name: 'docs' }])
 */
const uploadMultipleFile = (fields) => {
  // Default to single field called 'files' if no input
  const multerFields = _.isEmpty(fields)
    ? [{ name: 'files' }]
    : fields;

    const uploadDir = path.join(__dirname, '..', 'uploads');

// Ensure the uploads/ directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

  return (req, res, next) => {
    upload.fields(multerFields)(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File size should not exceed 10MB' });
        }
        return res.status(400).json({ error: err.message });
      } else if (err) {
        return res.status(500).json({ error: 'Unexpected upload error' });
      }
      next();
    });
  };
};
 
module.exports = uploadMultipleFile;
