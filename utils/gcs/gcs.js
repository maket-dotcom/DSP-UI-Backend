const { Storage } = require("@google-cloud/storage");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const MAX_REMOTE_FILE_BYTES = 25 * 1024 * 1024; // 25 MB safety cap

const GCS_BUCKET_NAME = process.env.GCS_BUCKET_NAME;
const GCS_KEY_FILE = process.env.GCS_KEY_FILE; // path to service account JSON key file
const GCS_PROJECT_ID = process.env.GCS_PROJECT_ID;

let storage;

// Initialize GCS client
// Supports both key file and Application Default Credentials (ADC)
if (GCS_KEY_FILE) {
  storage = new Storage({
    projectId: GCS_PROJECT_ID,
    keyFilename: GCS_KEY_FILE,
  });
} else {
  // Falls back to ADC (e.g., when running on GCP infra)
  storage = new Storage({
    projectId: GCS_PROJECT_ID,
  });
}

const bucket = storage.bucket(GCS_BUCKET_NAME);

/**
 * Upload a file to GCS with a structured destination path.
 *
 * @param {string} localFilePath - Absolute path to the local file
 * @param {string} destinationPath - The full path inside the bucket (folder + fileName)
 *                                   e.g. "report_store/daily/appsflyer/2026-04-15_2026-04-15/story_tv_drama_reels/file.csv"
 * @param {boolean} makePublic - Whether to make the file publicly accessible (default: true)
 * @returns {Object} { url, gcsPath, bucket }
 */
const uploadFile = async ({ localFilePath, destinationPath }) => {
  try {
    const options = {
      destination: destinationPath,
      metadata: {
        contentType: "text/csv",
      },
    };

    await bucket.upload(localFilePath, options);

    // Generate a signed URL (valid for 7 days)
    const signedUrl = await getSignedUrl(destinationPath, 7 * 24 * 60);

    console.log(`[GCS] File uploaded successfully: ${destinationPath}`);

    // Clean up local temp file
    deleteLocalFile(localFilePath);

    return {
      url: signedUrl,
      gcsPath: destinationPath,
      bucket: GCS_BUCKET_NAME,
    };
  } catch (error) {
    deleteLocalFile(localFilePath);
    console.error("[GCS] Error uploading file:", error.message);
    throw new Error(`GCS upload failed: ${error.message}`);
  }
};

/**
 * Upload an in-memory buffer to GCS (e.g. a multer memoryStorage file).
 *
 * @param {Buffer} buffer - The file contents
 * @param {string} destinationPath - The full path inside the bucket (folder + fileName)
 * @param {string} contentType - MIME type of the file (e.g. "image/png")
 * @param {boolean} makePublic - Whether to expose a public URL (default: true).
 *                               Falls back to a signed URL if the bucket disallows
 *                               object-level ACLs (uniform bucket-level access).
 * @returns {Object} { url, gcsPath, bucket }
 */
const uploadBuffer = async ({
  buffer,
  destinationPath,
  contentType,
  makePublic = true,
}) => {
  try {
    const file = bucket.file(destinationPath);

    await file.save(buffer, {
      resumable: false,
      metadata: {
        contentType: contentType || "application/octet-stream",
      },
    });

    let url;
    if (makePublic) {
      try {
        await file.makePublic();
        url = `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${destinationPath}`;
      } catch (aclErr) {
        // Bucket likely uses uniform bucket-level access; fall back to a signed URL.
        console.warn(
          "[GCS] makePublic failed, falling back to signed URL:",
          aclErr.message
        );
        url = await getSignedUrl(destinationPath, 7 * 24 * 60);
      }
    } else {
      url = await getSignedUrl(destinationPath, 7 * 24 * 60);
    }

    console.log(`[GCS] Buffer uploaded successfully: ${destinationPath}`);

    return {
      url,
      gcsPath: destinationPath,
      bucket: GCS_BUCKET_NAME,
    };
  } catch (error) {
    console.error("[GCS] Error uploading buffer:", error.message);
    throw new Error(`GCS buffer upload failed: ${error.message}`);
  }
};

/**
 * Build the permanent public URL for an object. Valid only when the bucket is
 * publicly readable (e.g. uniform bucket-level access with `allUsers` granted
 * Storage Object Viewer). This URL NEVER expires.
 *
 * @param {string} destinationPath - The full path inside the bucket
 * @returns {string} Public URL, e.g. https://storage.googleapis.com/<bucket>/<path>
 */
const getPublicUrl = (destinationPath) => {
  // Encode each path segment (preserve the "/" separators) so names with spaces
  // or reserved characters resolve correctly.
  const encoded = String(destinationPath)
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  return `https://storage.googleapis.com/${GCS_BUCKET_NAME}/${encoded}`;
};

/**
 * Upload an in-memory buffer and return its PERMANENT public URL.
 *
 * Use this when the bucket is already public (uniform bucket-level access) and
 * you want to persist a non-expiring link in the database. Unlike uploadBuffer,
 * this does NOT call makePublic() (which fails under uniform bucket-level access)
 * and does NOT generate a signed/expiring URL — it just returns the static
 * public URL for the object.
 *
 * @param {Buffer} buffer - The file contents
 * @param {string} destinationPath - The full path inside the bucket (folder + fileName)
 * @param {string} contentType - MIME type of the file (e.g. "image/png")
 * @returns {Object} { url, gcsPath, bucket }
 */
const uploadPublicBuffer = async ({ buffer, destinationPath, contentType }) => {
  try {
    const file = bucket.file(destinationPath);

    await file.save(buffer, {
      resumable: false,
      metadata: {
        contentType: contentType || "application/octet-stream",
        // Objects live at a unique (uuid) path and are never overwritten, so they
        // can be cached aggressively by browsers/CDNs.
        cacheControl: "public, max-age=31536000, immutable",
      },
    });

    const url = getPublicUrl(destinationPath);
    console.log(`[GCS] Public object uploaded: ${destinationPath}`);

    return {
      url,
      gcsPath: destinationPath,
      bucket: GCS_BUCKET_NAME,
    };
  } catch (error) {
    console.error("[GCS] Error uploading public object:", error.message);
    throw new Error(`GCS public upload failed: ${error.message}`);
  }
};

/**
 * Download a remote file (by URL) and upload it into the bucket.
 *
 * @param {string} url - The remote file URL to download
 * @param {string} destinationPath - The full path inside the bucket (folder + fileName)
 * @param {boolean} makePublic - Whether to expose a public URL (default: true)
 * @param {boolean} publicUrl - When true, store a PERMANENT public URL (no signing,
 *                              no makePublic) via uploadPublicBuffer. Use this for
 *                              links persisted in the DB so they never expire.
 * @returns {Object} { url, gcsPath, bucket, contentType }
 */
const uploadFromUrl = async ({
  url,
  destinationPath,
  makePublic = true,
  publicUrl = false,
}) => {
  let response;
  try {
    response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 20000,
      maxContentLength: MAX_REMOTE_FILE_BYTES,
      maxBodyLength: MAX_REMOTE_FILE_BYTES,
    });
  } catch (error) {
    console.error("[GCS] Error downloading remote file:", error.message);
    throw new Error(`Failed to download file from URL: ${error.message}`);
  }

  const buffer = Buffer.from(response.data);
  const contentType =
    response.headers["content-type"] || "application/octet-stream";

  const result = publicUrl
    ? await uploadPublicBuffer({ buffer, destinationPath, contentType })
    : await uploadBuffer({ buffer, destinationPath, contentType, makePublic });
  return { ...result, contentType };
};

/**
 * Delete a file from GCS bucket.
 *
 * @param {string} destinationPath - The full path inside the bucket
 */
const deleteFile = async (destinationPath) => {
  try {
    await bucket.file(destinationPath).delete();
    console.log(`[GCS] File deleted successfully: ${destinationPath}`);
  } catch (error) {
    console.error("[GCS] Error deleting file:", error.message);
  }
};

/**
 * Generate a signed URL for temporary access to a private file.
 *
 * @param {string} destinationPath - The full path inside the bucket
 * @param {number} expiresInMinutes - URL expiry time in minutes (default: 60)
 * @returns {string} Signed URL
 */
const getSignedUrl = async (destinationPath, expiresInMinutes = 60) => {
  try {
    const [url] = await bucket.file(destinationPath).getSignedUrl({
      action: "read",
      expires: Date.now() + expiresInMinutes * 60 * 1000,
    });
    return url;
  } catch (error) {
    console.error("[GCS] Error generating signed URL:", error.message);
    throw new Error(`GCS signed URL failed: ${error.message}`);
  }
};

/**
 * Check if a file exists in the bucket.
 *
 * @param {string} destinationPath - The full path inside the bucket
 * @returns {boolean}
 */
const fileExists = async (destinationPath) => {
  try {
    const [exists] = await bucket.file(destinationPath).exists();
    return exists;
  } catch (error) {
    return false;
  }
};

const deleteLocalFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`[GCS] Error deleting local file at ${filePath}:`, err);
    } else {
      console.log(`[GCS] Successfully deleted local file at ${filePath}`);
    }
  });
};

module.exports = {
  uploadFile,
  uploadBuffer,
  uploadPublicBuffer,
  uploadFromUrl,
  deleteFile,
  getSignedUrl,
  getPublicUrl,
  fileExists,
  storage,
  bucket,
};
