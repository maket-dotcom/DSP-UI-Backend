const Joi = require('joi');
const { UPLOAD_TYPES } = require("./constant");

const add = Joi.object({
  name: Joi.string().required(),
  type: Joi.string()
    .valid(...UPLOAD_TYPES)
    .optional(),
  parentId: Joi.string().optional(),
});

const remove = Joi.object({
    id: Joi.string().length(24).required(),
});

const removeMany = Joi.object({
  ids: Joi.array().items(Joi.string().length(24)).required(),
});

module.exports = {
    add,
    remove,
    removeMany
};
