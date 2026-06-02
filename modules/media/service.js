const mediaModel = require("./model");
const _ = require("lodash");
const { v4: uuidv4 } = require("uuid");
const { isUndefinedOrNull } = require("../../utils/validators");
const { STATUS, DEFAULT_UPLOAD_TYPE } = require("./constant");
const { gcs } = require("../../utils/gcs");

require("dotenv").config();

// Keep file names safe for use as a GCS object path segment.
const sanitizeFileName = (name) =>
  String(name || "file").replace(/[^a-zA-Z0-9._-]/g, "_");

const mediaService = {
  add: async ({ data, files, reqBy }) => {
    let { name, type, parentId } = data;

    const file = files?.image?.[0];
    if (isUndefinedOrNull(file) || isUndefinedOrNull(file.buffer)) {
      throw new Error("No file provided. Attach a file under the 'image' field.");
    }

    if (isUndefinedOrNull(type)) type = DEFAULT_UPLOAD_TYPE;

    // Structured, collision-free destination inside the bucket:
    //   media/org_<orgId>/<type>[/<parentId>]/<uuid>_<originalName>
    let folder = `media/org_${reqBy.org_id}/${type}`;
    if (!isUndefinedOrNull(parentId)) folder = `${folder}/${parentId}`;
    const fileName = `${uuidv4()}_${sanitizeFileName(file.originalname)}`;
    const destinationPath = `${folder}/${fileName}`;

    const uploaded = await gcs.uploadBuffer({
      buffer: file.buffer,
      destinationPath,
      contentType: file.mimetype,
      makePublic: true,
    });

    const media = new mediaModel({
      orgId: reqBy.org_id,
      brandId: reqBy.user_id,
      name: name,
      type: type,
      link1: uploaded.url,
      gcsPath: uploaded.gcsPath,
      mappingId: uploaded.gcsPath,
      fileType: file.mimetype,
      productId: parentId,
      status: STATUS.PAUSED,
    });

    const saved = await media.save();

    return { message: `Media registered successfully.`, data: saved };
  },

  remove: async ({ data, reqBy }) => {
    const { id } = data;

    const media = await mediaModel.findOne({ _id: id, orgId: reqBy.org_id });

    if (isUndefinedOrNull(media)) {
      throw new Error(`No media exists with given id: ${id}`);
    }

    if (!isUndefinedOrNull(media.gcsPath)) {
      await gcs.deleteFile(media.gcsPath);
    }

    await mediaModel.updateOne({ _id: id }, { status: STATUS.DELETED });

    return {
      result: `Media deleted Successfully`,
      data: {
        id: media._id,
        name: media.name,
      },
    };
  },

  removeMany: async ({ data, reqBy }) => {
    const { ids } = data;

    const medias = await mediaModel.find({
      _id: { $in: ids },
      orgId: reqBy.org_id,
    });

    if (isUndefinedOrNull(medias) || _.size(medias) === 0) {
      throw new Error(`No medias exists with given ids: ${ids}`);
    }

    for (const media of medias) {
      if (!isUndefinedOrNull(media.gcsPath)) {
        await gcs.deleteFile(media.gcsPath);
      }
    }

    await mediaModel.updateMany(
      { _id: { $in: medias.map((m) => m._id) } },
      { status: STATUS.DELETED }
    );

    return {
      result: `Medias deleted Successfully`,
    };
  },
};

module.exports = mediaService;
