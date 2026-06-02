const Joi = require("joi");
const { ACTIONS, RESOURCES, STATUS } = require("./constant");

const permissionsSchema = Joi.object().pattern(
  Joi.string().valid(...Object.values(RESOURCES)),
  Joi.array().items(Joi.string().valid(...Object.values(ACTIONS))).unique()
);

const upsert = Joi.object({
  userId: Joi.string().required(),
  permissions: permissionsSchema.required(),
  status: Joi.string().valid(...Object.values(STATUS)).optional(),
});

const byUser = Joi.object({
  userId: Joi.string().required(),
});

module.exports = {
  upsert,
  byUser,
};
