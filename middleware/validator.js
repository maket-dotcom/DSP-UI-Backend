const _ = require("lodash");
const { Logger } = require("../logger");
const { isUndefinedOrNull } = require("../utils/validators");

const validateInfo = (joiSchema, obj) => {
  if (isUndefinedOrNull(joiSchema) || isUndefinedOrNull(obj)) {
    throw new Error("Joi validator exception");
  }
  let { error, value } = joiSchema.validate(obj);
  if (error) {
    let errorMessage =
      _.size(error.details) > 0 ? error.details[0].message : null;
    throw new Error(errorMessage);
  }
  return value;
};

module.exports = validateInfo;
