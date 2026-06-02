const Joi = require("joi");
const { TYPE, STATUS, CATEGORY_ARRAY, TIMEZONE_ARRAY } = require("./constant");
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// org members an admin/team can manage; super_admin is intentionally excluded
const MANAGEABLE_TYPES = [TYPE.ADMIN, TYPE.TEAM];

const acceptingArray = Joi.alternatives()
  .try(Joi.string(), Joi.array().items(Joi.string()))
  .custom((value, helpers) => {
    if (typeof value === "string") {
      return [value];
    }
    return value;
  }, "string to array conversion");


// org-scoped login: admin/team members belong to a specific organisation
const login = Joi.object({
  orgId: Joi.string().trim().required().messages({
    'string.empty': 'orgId is required.',
    'any.required': 'orgId is required.',
  }),
  email: Joi.string()
    .trim()
    .lowercase()
    .required()
    .pattern(emailRegex)
    .messages({
      'string.empty': 'Email is required.',
      'string.pattern.base': 'Please enter a valid email address.',
      'any.required': 'Email is required.',
    }),
  password: Joi.string().required(),
});

// super-admin login: platform-wide, not bound to any organisation (no orgId)
const superAdminLogin = Joi.object({
  email: Joi.string()
    .trim()
    .lowercase()
    .required()
    .pattern(emailRegex)
    .messages({
      'string.empty': 'Email is required.',
      'string.pattern.base': 'Please enter a valid email address.',
      'any.required': 'Email is required.',
    }),
  password: Joi.string().required(),
});

// super-admin onboarding: create an organisation and its admin user in one call
const createOrgWithAdmin = Joi.object({
  orgName: Joi.string().trim().required(),
  orgType: Joi.string().optional(),
  timezone: Joi.string().valid(...TIMEZONE_ARRAY).optional(),
  subdomain: Joi.string().trim().lowercase().optional(),
  name: Joi.string().trim().required(),
  email: Joi.string()
    .trim()
    .lowercase()
    .required()
    .pattern(emailRegex)
    .messages({
      'string.pattern.base': 'Please enter a valid email address.',
      'any.required': 'Admin email is required.',
    }),
  mobile: Joi.string().trim().required(),
  password: Joi.string().min(6).required(),
  address: Joi.string().optional(),
});


// admin/team creating a user inside their own org
const createUser = Joi.object({
  name: Joi.string().trim().required(),
  email: Joi.string()
    .trim()
    .lowercase()
    .required()
    .pattern(emailRegex)
    .messages({
      'string.pattern.base': 'Please enter a valid email address.',
      'any.required': 'Email is required.',
    }),
  mobile: Joi.string().trim().required(),
  password: Joi.string().min(6).required(),
  type: Joi.string().valid(...MANAGEABLE_TYPES).default(TYPE.TEAM),
  gender: Joi.string().optional(),
  age: Joi.number().optional(),
  address: Joi.string().optional(),
  status: Joi.string().valid(...Object.values(STATUS)).optional(),
});

const updateUser = Joi.object({
  name: Joi.string().trim().optional(),
  mobile: Joi.string().trim().optional(),
  type: Joi.string().valid(...MANAGEABLE_TYPES).optional(),
  gender: Joi.string().optional(),
  age: Joi.number().optional(),
  address: Joi.string().optional(),
  status: Joi.string().valid(...Object.values(STATUS)).optional(),
}).min(1);

const listUsers = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  type: Joi.string().valid(...MANAGEABLE_TYPES).optional(),
  status: Joi.string().valid(...Object.values(STATUS)).optional(),
  search: Joi.string().trim().optional(),
});

module.exports = {
  login,
  superAdminLogin,
  createOrgWithAdmin,
  createUser,
  updateUser,
  listUsers,
};
