const ImageKit = require("imagekit");
require("dotenv").config();
const fs = require('fs');
const path = require('path');
const details = require("./details");
const { isUndefinedOrNull } = require("../validators");
const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
const accessUrl = process.env.IMAGEKIT_ACCESS_URL;

const imagekit = new ImageKit({
  publicKey,
  privateKey,
  urlEndpoint: accessUrl,
});

const deleteLocalFile = (filePath) => {
  fs.unlink(filePath, (err) => {
    if (err) {
      console.error(`Error deleting file at ${filePath}:`, err);
    } else {
      console.log(`Successfully deleted file at ${filePath}`);
    }
  });
};

// Function to upload an image
const uploadImage = async ({ filePath, user, type }) => {
  try {
    const result = await imagekit.upload({
      file: fs.readFileSync(filePath), // required
      fileName: path.basename(filePath), // required
      folder: `${user.type}/${user.user_id}/${type}`
    });
    console.log("Image uploaded successfully:", result);
    deleteLocalFile(filePath);
    return result;
  } catch (error) {
    deleteLocalFile(filePath);
    console.error("Error uploading image:", error);
    throw Error('Error uploading image:", error')
  }

}

const uploadPlatformReport = async ({ filePath, user, platform }) => {
  try {
    const result = await imagekit.upload({
      file: fs.readFileSync(filePath),
      fileName: path.basename(filePath),
      folder: `${details.TYPES.PLATFORM_REPORT}/${platform}/${user.org_id}`
    });
    console.log("Platform report uploaded successfully:", result);
    deleteLocalFile(filePath);
    return result;
  } catch (error) {
    deleteLocalFile(filePath);
    console.error("Error uploading platform report:", error);
    throw Error('Error uploading platform report');
  }

}

const uploadCampExportData = async ({ filePath, user, platform }) => {
  try {
    const result = await imagekit.upload({
      file: fs.readFileSync(filePath),
      fileName: path.basename(filePath),
      folder: `${details.TYPES.CAMPAIGN_EXPORT}/${platform}/${user.org_id}`
    });
    console.log("Platform report uploaded successfully:", result);
    deleteLocalFile(filePath);
    return result;
  } catch (error) {
    deleteLocalFile(filePath);
    console.error("Error uploading platform report:", error);
    throw Error('Error uploading platform report');
  }

}


const uploadEmailAttachments = async ({ user, campId, affId, attachments }) => {
  const res = [];
  let filePath = null;
  for (const attach of attachments) {
    try {
      const filePath = attach.path;
      const result = await imagekit.upload({
        file: fs.readFileSync(filePath),
        fileName: path.basename(filePath),
        folder: `${details.TYPES.EMAIL_ATTACHMENTS}/org_${user.org_id}/user_${user.user_id}/camp_${campId}_aff_${affId}/`
      });
      console.log("Email attachment report uploaded successfully:", result);
      res.push({
        filename: attach.filename,
        url: result.url
      })
      if (!isUndefinedOrNull(filePath)) deleteLocalFile(filePath);
    } catch (error) {
      if (!isUndefinedOrNull(filePath)) deleteLocalFile(filePath);
      console.error("Error uploading email attachment:", error);
      throw Error('Error uploading email attachment');
    }
  }
  return res;
}

// Function to delete an image
const deleteImage = async (fileId) => {
  try {
    const result = await imagekit.deleteFile(fileId);
    console.log("Image deleted successfully:", result);
    return result;
  } catch (error) {
    console.error("Error deleting image:", error);
    throw Error('Error deleting image:", error');
  }
}

/**
 * Upload a report file to ImageKit with a structured folder path.
 * Folder structure: report_store/{frequency}/{platform}/{dateRange}/{appId}/
 */
const uploadReportStore = async ({ filePath, folder, fileName }) => {
  try {
    const result = await imagekit.upload({
      file: fs.readFileSync(filePath),
      fileName: fileName,
      folder: folder,
    });
    console.log("Report store file uploaded successfully:", result);
    deleteLocalFile(filePath);
    return result;
  } catch (error) {
    deleteLocalFile(filePath);
    console.error("Error uploading report store file:", error);
    throw Error("Error uploading report store file");
  }
};

module.exports = {
    uploadImage,
    deleteImage,
    uploadPlatformReport,
    uploadCampExportData,
    uploadEmailAttachments,
    uploadReportStore
}