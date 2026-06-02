const userDetailsModel = require("./model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { isUndefinedOrNull } = require("../../utils/validators");
const { TYPE, STATUS } = require('./constant');
const { generateOTP } = require("../../utils/common");
const sendMail = require('../../utils/notification/email/send');
const { RedisCacheKey } = require("../../connection/redis");
const { putObjectToBucket } = require("../../utils/s3/s3");
const { s3ObjectDetails } = require("../../utils/s3/index");
const { imagekit, details } = require('../../utils/imagekit');
const { organizationConstant, organizationService, organizationModel } = require('../organization/index')
const path = require("path");
const { v4: uuidv4 } = require('uuid');

const fs = require("fs");
const Utf8EncodeDecode = require("../../utils/Utf8EncodDecode");
const { STATES } = require("mongoose");

require("dotenv").config();

// Session/JWT lifetime: 30 days (seconds; Redis EX + jwt expiresIn both use seconds).
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

const getUserCacheKey = (id) => {
  return `user_by_id_${id}`;
}

/**
 * Sign a JWT for the user, stash it in Redis under an opaque key, and return
 * that key as the bearer token. `auth`/`authSuperAdmin` resolve the key back to
 * the JWT on each request. A super admin carries no `org_id` in its payload.
 */
const issueToken = async (user) => {
  const payload = {
    user_id: user._id,
    type: user.type,
  };
  if (!isUndefinedOrNull(user.orgId)) {
    payload.org_id = user.orgId;
  }

  const jwtToken = jwt.sign(payload, process.env.TOKEN_KEY, {
    expiresIn: TOKEN_TTL_SECONDS,
  });

  const sessionToken = uuidv4();
  await RedisCacheKey.setValueForTime(sessionToken, jwtToken, TOKEN_TTL_SECONDS);

  return sessionToken;
};
const isValidEmail = (email) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const validateMail = (email) => {
  if (!isValidEmail(email))
    throw new Error("Please enter valid email")
}

const userService = {

  // org-scoped login for admin/team members.
  // orgId is required because the same email may exist across organisations,
  // and admin/team accounts are always bound to exactly one org.
  login: async ({ data }) => {
    const { orgId, email, password } = data;

    const user = await userDetailsModel.findOne({
      orgId,
      email,
      type: { $in: [TYPE.ADMIN, TYPE.TEAM] },
    });

    // Use a single generic error to avoid leaking which part was wrong.
    if (isUndefinedOrNull(user)) {
      throw new Error("Invalid credentials");
    }
    if (user.status === STATUS.DELETED || user.status === STATUS.INACTIVE) {
      throw new Error("Account is not active");
    }

    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    const token = await issueToken(user);

    return {
      message: "Logged in successfully",
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          type: user.type,
          orgId: user.orgId,
        },
      },
    };
  },

  // dedicated super-admin login. Not org-scoped: a super admin is platform-wide
  // and is identified purely by email + the super_admin type.
  superAdminLogin: async ({ data }) => {
    const { email, password } = data;

    const user = await userDetailsModel.findOne({
      email,
      type: TYPE.SUPER_ADMIN,
    });

    if (isUndefinedOrNull(user)) {
      throw new Error("Invalid credentials");
    }
    if (user.status === STATUS.DELETED || user.status === STATUS.INACTIVE) {
      throw new Error("Account is not active");
    }

    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) {
      throw new Error("Invalid credentials");
    }

    // issueToken omits org_id for super admins (orgId is undefined on the doc).
    const token = await issueToken(user);

    return {
      message: "Logged in successfully",
      data: {
        token,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          type: user.type,
        },
      },
    };
  },

  // super-admin only: provision a new organisation together with its admin user
  createOrgWithAdmin: async ({ data }) => {
    let {
      name,
      email,
      mobile,
      password,
      address,
      orgName,
      orgType,
      timezone,
      subdomain,
    } = data;

    let existing = await userDetailsModel.findOne({ email });
    if (!isUndefinedOrNull(existing)) {
      throw new Error("Email Id already registred " + email);
    }

    existing = await userDetailsModel.findOne({ mobile });
    if (!isUndefinedOrNull(existing)) {
      throw new Error("Contact number already registred " + mobile);
    }

    if (isUndefinedOrNull(orgType))
      orgType = organizationConstant.ORG_TYPE.INDIVIDUAL;

    const org = await organizationService.addOrganization({
      data: { orgType, orgName, timezone, subdomain },
    });

    const user = new userDetailsModel();
    user.name = name;
    user.email = email;
    user.mobile = mobile;
    user.address = address;
    user.type = TYPE.ADMIN;
    user.orgId = org._id;
    user.isVerified = false;
    user.password = await bcrypt.hash(password, 10);
    const savedUser = await user.save();

    await organizationService.updateAdminId({ org, adminId: savedUser._id });

    return {
      message: `Organization '${org.name}' and its admin created successfully.`,
      data: {
        org,
        admin: {
          _id: savedUser._id,
          name: savedUser.name,
          email: savedUser.email,
          type: savedUser.type,
          orgId: savedUser.orgId,
        },
      },
    };
  },

  // admin/team creates a user inside their own org
  createUser: async ({ data, reqBy }) => {
    let { name, email, mobile, password, type, gender, age, address, status } = data;
    if (isUndefinedOrNull(type)) type = TYPE.TEAM;

    // a team member may not create an admin user
    if (reqBy.type === TYPE.TEAM && type === TYPE.ADMIN) {
      throw new Error("You are not allowed to create an admin user");
    }

    let existing = await userDetailsModel.findOne({ email });
    if (!isUndefinedOrNull(existing)) {
      throw new Error("Email Id already registred " + email);
    }

    existing = await userDetailsModel.findOne({ mobile });
    if (!isUndefinedOrNull(existing)) {
      throw new Error("Contact number already registred " + mobile);
    }

    const user = new userDetailsModel();
    user.name = name;
    user.email = email;
    user.mobile = mobile;
    user.type = type;
    user.orgId = reqBy.org_id;
    user.gender = gender;
    user.age = age;
    user.address = address;
    user.status = isUndefinedOrNull(status) ? STATUS.ACTIVE : status;
    user.isVerified = false;
    user.password = await bcrypt.hash(password, 10);
    const savedUser = await user.save();

    const result = savedUser.toObject();
    delete result.password;

    return { message: "User created successfully", data: result };
  },

  // list users within the requester's org (paginated, excludes soft-deleted)
  listUsers: async ({ data, reqBy }) => {
    const { page, limit, type, status, search } = data;

    const query = { orgId: reqBy.org_id };
    query.status = isUndefinedOrNull(status) ? { $ne: STATUS.DELETED } : status;
    if (!isUndefinedOrNull(type)) query.type = type;
    if (!isUndefinedOrNull(search)) {
      const rx = new RegExp(search, "i");
      query.$or = [{ name: rx }, { email: rx }, { mobile: rx }];
    }

    const skip = (page - 1) * limit;
    const [users, total] = await Promise.all([
      userDetailsModel
        .find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      userDetailsModel.countDocuments(query),
    ]);

    return {
      data: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  getUser: async ({ userId, reqBy }) => {
    const user = await userDetailsModel
      .findOne({ _id: userId, orgId: reqBy.org_id })
      .select("-password");
    if (isUndefinedOrNull(user)) {
      throw new Error("Invalid user id " + userId);
    }
    return { data: user };
  },

  updateUser: async ({ userId, data, reqBy }) => {
    const target = await userDetailsModel.findOne({ _id: userId, orgId: reqBy.org_id });
    if (isUndefinedOrNull(target)) {
      throw new Error("Invalid user id " + userId);
    }

    // only an admin (or super_admin) may modify an admin or grant the admin role
    const callerIsAdminLevel =
      reqBy.type === TYPE.ADMIN || reqBy.type === TYPE.SUPER_ADMIN;
    if (target.type === TYPE.ADMIN && !callerIsAdminLevel) {
      throw new Error("You are not allowed to modify an admin user");
    }
    if (data.type === TYPE.ADMIN && !callerIsAdminLevel) {
      throw new Error("You are not allowed to assign the admin role");
    }

    const allowed = ["name", "mobile", "type", "gender", "age", "address", "status"];
    const update = {};
    for (const field of allowed) {
      if (!isUndefinedOrNull(data[field])) update[field] = data[field];
    }

    const updated = await userDetailsModel
      .findOneAndUpdate({ _id: userId, orgId: reqBy.org_id }, { $set: update }, { new: true })
      .select("-password");

    await RedisCacheKey.deleteKey(getUserCacheKey(userId));

    return { message: "User updated successfully", data: updated };
  },

  // soft delete: marks the user as deleted within the requester's org
  deleteUser: async ({ userId, reqBy }) => {
    if (userId == reqBy.user_id) {
      throw new Error("You cannot delete your own account");
    }

    const target = await userDetailsModel.findOne({ _id: userId, orgId: reqBy.org_id });
    if (isUndefinedOrNull(target)) {
      throw new Error("Invalid user id " + userId);
    }
    const callerIsAdminLevel =
      reqBy.type === TYPE.ADMIN || reqBy.type === TYPE.SUPER_ADMIN;
    if (target.type === TYPE.ADMIN && !callerIsAdminLevel) {
      throw new Error("You are not allowed to delete an admin user");
    }

    await userDetailsModel.findOneAndUpdate(
      { _id: userId, orgId: reqBy.org_id },
      { $set: { status: STATUS.DELETED } }
    );

    await RedisCacheKey.deleteKey(getUserCacheKey(userId));

    return { message: "User deleted successfully" };
  },

};

module.exports = userService;
