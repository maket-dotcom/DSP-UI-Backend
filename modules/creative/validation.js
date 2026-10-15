const Joi = require("joi");
const { STATUS, TYPE } = require("./constant");

const objectId = Joi.string().trim().pattern(/^[a-fA-F0-9]{24}$/).messages({
  "string.pattern.base": "{{#label}} must be a valid id",
});

const create = Joi.object({
  advertiserId: objectId.required(),
  mediaId: objectId.optional(), // the media upload this creative wraps
  name: Joi.string().trim().max(200).allow("", null).optional(),
  type: Joi.string().valid(...Object.values(TYPE)).required(),
  link: Joi.string().trim().uri().allow("", null).optional(),
  w: Joi.number().integer().min(0).allow(null).optional(),
  h: Joi.number().integer().min(0).allow(null).optional(),
  duration: Joi.number().min(0).allow(null).optional(),
  vastTag: Joi.string().trim().uri().allow("", null).optional(),
  mime: Joi.string().trim().allow("", null).optional(),
  clickUrl: Joi.string().trim().allow("", null).optional(),
})
  // A creative needs something to serve: an upload (mediaId — the service reads
  // its link), a hosted file link, or a VAST tag for video.
  .custom((v, helpers) => {
    const hasLink = (v.link && v.link !== "") || !!v.mediaId;
    const hasVast = v.type === TYPE.VIDEO && v.vastTag && v.vastTag !== "";
    if (!hasLink && !hasVast) {
      return helpers.message("A creative needs an uploaded file (link) or, for video, a VAST tag URL");
    }
    return v;
  });

const update = Joi.object({
  name: Joi.string().trim().max(200).allow("", null).optional(),
  clickUrl: Joi.string().trim().allow("", null).optional(),
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED).optional(),
}).min(1);

const list = Joi.object({
  advertiserId: objectId.required(),
  type: Joi.string().valid(...Object.values(TYPE)).optional(),
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.PAUSED).optional(),
  search: Joi.string().trim().allow("").optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(100),
});

module.exports = { create, update, list, objectId };
