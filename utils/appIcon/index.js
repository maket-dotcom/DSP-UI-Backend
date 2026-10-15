const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { gcs } = require("../gcs");
const { isUndefinedOrNull } = require("../validators");

// True when the URL already points at our own GCS bucket (public or signed).
// Such URLs are already stored by us, so we must NOT try to re-download them
// (re-fetching our own signed/expiring URL fails with a 400).
const isOurBucketUrl = (url) =>
  typeof url === "string" && url.includes("storage.googleapis.com");

// Download an external app-icon URL and store it in our GCS bucket, returning
// our bucket URL (never the external one). If the URL is already our bucket
// URL (e.g. on edit/update), it is returned unchanged. Shared by campaigns and
// advertisers.
const uploadAppIcon = async ({ url, orgId }) => {
  if (isOurBucketUrl(url)) {
    return url;
  }

  let ext = "";
  try {
    ext = path.extname(new URL(url).pathname);
  } catch (e) {
    ext = "";
  }
  if (isUndefinedOrNull(ext) || ext === "") ext = ".png";

  const destinationPath = `campaign/org_${orgId}/app_icons/${uuidv4()}${ext}`;
  const { url: bucketUrl } = await gcs.uploadFromUrl({
    url,
    destinationPath,
    publicUrl: true, // store a permanent public URL in the DB (never expires)
  });
  return bucketUrl;
};

module.exports = { uploadAppIcon, isOurBucketUrl };
