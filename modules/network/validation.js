const Joi = require("joi");
const { STATUS } = require("./constant");

const fields = {
  name: Joi.string().trim().max(120),
  contactName: Joi.string().trim().max(120).allow("", null),
  contactEmail: Joi.string().trim().lowercase().email({ tlds: { allow: false } }).allow("", null).messages({
    "string.email": "Please enter a valid contact email address.",
  }),
  requireApproval: Joi.boolean(),
  notes: Joi.string().trim().max(2000).allow("", null),
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.INACTIVE),
};

const create = Joi.object({
  ...fields,
  name: fields.name.required(),
  requireApproval: fields.requireApproval.default(true),
  status: fields.status.default(STATUS.ACTIVE),
});

// Status changes go through changeStatus.
const { status, ...editable } = fields;
const update = Joi.object(editable).min(1);

const changeStatus = Joi.object({
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.INACTIVE).required(),
});

const list = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid(STATUS.ACTIVE, STATUS.INACTIVE).optional(),
  search: Joi.string().trim().allow("").optional(),
});

module.exports = { create, update, changeStatus, list };
