const userDetailsModel = require("./model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { isUndefinedOrNull } = require("../../utils/validators");
const { gcs } = require("../../utils/gcs");
const { TYPE, STATUS, DATA_MAPPING, NETWORK_TYPES } = require('./constant');
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

// Lazily required: the network module requires the user model.
const networkModel = () => require("../network/model");
const networkService = () => require("../network/service");

// Users the caller manages: one network's when the caller works in a network
// (a network user, or an org user who entered one), else the whole org.
const userScope = (reqBy) =>
  isUndefinedOrNull(reqBy.network_id)
    ? { orgId: reqBy.org_id }
    : { orgId: reqBy.org_id, networkId: reqBy.network_id };

const isAdminLevel = (type) =>
  type === TYPE.SUPER_ADMIN || type === TYPE.ADMIN || type === TYPE.NETWORK_ADMIN;
const isAdminType = (type) => type === TYPE.ADMIN || type === TYPE.NETWORK_ADMIN;

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
  if (!isUndefinedOrNull(user.networkId)) {
    payload.network_id = String(user.networkId);
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

  // org-scoped login for admin/team members and network users.
  // orgId is required because the same email may exist across organisations,
  // and these accounts are always bound to exactly one org.
  login: async ({ data }) => {
    const { orgId, email, password } = data;

    const user = await userDetailsModel.findOne({
      orgId,
      email,
      type: { $in: [TYPE.ADMIN, TYPE.TEAM, ...NETWORK_TYPES] },
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

    // A network user can sign in only while their network is active.
    let network = null;
    if (NETWORK_TYPES.includes(user.type)) {
      network = await networkModel()
        .findOne({ _id: user.networkId, orgId: user.orgId })
        .select({ name: 1, status: 1 })
        .lean();
      if (isUndefinedOrNull(network) || network.status !== "active") {
        throw new Error("Your network is turned off. Contact your organization.");
      }
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
          networkId: user.networkId || null,
          networkName: network ? network.name : null,
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

  // Self-serve signup for MCP publishers: creates a `publisher` org and its
  // single `supply` user, then logs them in. Supply users only ever reach the
  // /mcp-publisher routes; ads only fill once super admin approves a server.
  supplySignup: async ({ data }) => {
    const { orgName, name, email, mobile, password } = data;

    let existing = await userDetailsModel.findOne({ email });
    if (!isUndefinedOrNull(existing)) {
      throw new Error("Email Id already registred " + email);
    }
    if (!isUndefinedOrNull(mobile)) {
      existing = await userDetailsModel.findOne({ mobile });
      if (!isUndefinedOrNull(existing)) {
        throw new Error("Contact number already registred " + mobile);
      }
    }

    const org = await organizationService.addOrganization({
      data: { orgType: organizationConstant.ORG_TYPE.PUBLISHER, orgName },
    });

    const user = new userDetailsModel();
    user.name = name;
    user.email = email;
    user.mobile = mobile;
    user.type = TYPE.SUPPLY;
    user.status = STATUS.ACTIVE;
    user.orgId = org._id;
    user.isVerified = false;
    user.password = await bcrypt.hash(password, 10);
    const savedUser = await user.save();

    await organizationService.updateAdminId({ org, adminId: savedUser._id });

    const token = await issueToken(savedUser);

    return {
      message: "Account created successfully",
      data: {
        token,
        user: {
          _id: savedUser._id,
          name: savedUser.name,
          email: savedUser.email,
          type: savedUser.type,
          orgId: savedUser.orgId,
        },
      },
    };
  },

  // Supply login is by email alone (no orgId): supply emails are globally
  // unique because supplySignup rejects any email already registered.
  supplyLogin: async ({ data }) => {
    const { email, password } = data;

    const user = await userDetailsModel.findOne({ email, type: TYPE.SUPPLY });

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

  // admin/team creates a user inside their own org. Inside a network (a
  // network user, or an org user who entered one) the new user joins that
  // network; at org level, passing networkId creates a network login.
  createUser: async ({ data, reqBy }) => {
    let { name, email, mobile, password, type, gender, age, address, status, profilePic } = data;

    const networkId = reqBy.network_id || data.networkId || null;
    let network = null;
    if (networkId) {
      network = await networkService().assertUsable({ id: networkId, orgId: reqBy.org_id });
      if (isUndefinedOrNull(type)) type = TYPE.NETWORK_TEAM;
      if (!NETWORK_TYPES.includes(type)) {
        throw new Error("A network user must be a network admin or a network team member");
      }
    } else {
      if (isUndefinedOrNull(type)) type = TYPE.TEAM;
      if (NETWORK_TYPES.includes(type)) {
        throw new Error("Pick the network this user belongs to");
      }
    }

    // a team member may not create an admin user
    if (!isAdminLevel(reqBy.type) && isAdminType(type)) {
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
    user.networkId = networkId;
    user.gender = gender;
    user.age = age;
    user.address = address;
    user.status = isUndefinedOrNull(status) ? STATUS.ACTIVE : status;
    user.profilePic = profilePic;
    user.isVerified = false;
    user.password = await bcrypt.hash(password, 10);
    const savedUser = await user.save();

    // The network's first admin login is its main contact.
    if (network && type === TYPE.NETWORK_ADMIN && isUndefinedOrNull(network.adminId)) {
      await networkModel().updateOne({ _id: network._id }, { $set: { adminId: String(savedUser._id) } });
    }

    const result = savedUser.toObject();
    delete result.password;

    return { message: "User created successfully", data: result };
  },

  // list users within the requester's org (paginated, excludes soft-deleted).
  // At org level this lists org users, or one network's users with networkId;
  // inside a network it lists that network's users.
  listUsers: async ({ data, reqBy }) => {
    const { page, limit, type, status, search } = data;

    const query = userScope(reqBy);
    if (isUndefinedOrNull(reqBy.network_id)) query.networkId = data.networkId || null;
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
      dataMapping: DATA_MAPPING,
      data: users,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  },

  getUser: async ({ userId, reqBy }) => {
    const user = await userDetailsModel
      .findOne({ _id: userId, ...userScope(reqBy) })
      .select("-password");
    if (isUndefinedOrNull(user)) {
      throw new Error("Invalid user id " + userId);
    }
    return { data: user };
  },

  updateUser: async ({ userId, data, reqBy }) => {
    const target = await userDetailsModel.findOne({ _id: userId, ...userScope(reqBy) });
    if (isUndefinedOrNull(target)) {
      throw new Error("Invalid user id " + userId);
    }

    // only an admin (org, network or super) may modify an admin or grant the admin role
    const callerIsAdminLevel = isAdminLevel(reqBy.type);
    if (isAdminType(target.type) && !callerIsAdminLevel) {
      throw new Error("You are not allowed to modify an admin user");
    }
    if (isAdminType(data.type) && !callerIsAdminLevel) {
      throw new Error("You are not allowed to assign the admin role");
    }
    // org users stay org users and network users stay network users
    if (!isUndefinedOrNull(data.type) && NETWORK_TYPES.includes(data.type) !== NETWORK_TYPES.includes(target.type)) {
      throw new Error(
        NETWORK_TYPES.includes(target.type)
          ? "A network user must be a network admin or a network team member"
          : "An organization user must be an admin or a team member"
      );
    }

    const allowed = ["name", "mobile", "type", "gender", "age", "address", "status", "profilePic"];
    const update = {};
    for (const field of allowed) {
      if (!isUndefinedOrNull(data[field])) update[field] = data[field];
    }

    const updated = await userDetailsModel
      .findOneAndUpdate({ _id: userId, ...userScope(reqBy) }, { $set: update }, { new: true })
      .select("-password");

    await RedisCacheKey.deleteKey(getUserCacheKey(userId));

    return { message: "User updated successfully", data: updated };
  },

  // soft delete: marks the user as deleted within the requester's org
  deleteUser: async ({ userId, reqBy }) => {
    if (userId == reqBy.user_id) {
      throw new Error("You cannot delete your own account");
    }

    const target = await userDetailsModel.findOne({ _id: userId, ...userScope(reqBy) });
    if (isUndefinedOrNull(target)) {
      throw new Error("Invalid user id " + userId);
    }
    if (isAdminType(target.type) && !isAdminLevel(reqBy.type)) {
      throw new Error("You are not allowed to delete an admin user");
    }

    await userDetailsModel.findOneAndUpdate(
      { _id: userId, ...userScope(reqBy) },
      { $set: { status: STATUS.DELETED } }
    );

    await RedisCacheKey.deleteKey(getUserCacheKey(userId));

    return { message: "User deleted successfully" };
  },

  getProfile: async ({ reqBy }) => {
    const userId = reqBy.user_id;
    const user = await userDetailsModel.findById(userId).select("-password");
    if (isUndefinedOrNull(user)) {
      throw new Error("User profile not found");
    }
    return { data: user };
  },

  updateProfilePic: async ({ files, reqBy }) => {
    const userId = reqBy.user_id;
    const file = files?.image?.[0];
    if (isUndefinedOrNull(file) || isUndefinedOrNull(file.buffer)) {
      throw new Error("No file provided. Attach an image file under the 'image' field.");
    }

    const folder = `media/org_${reqBy.org_id}/profile`;
    const fileName = `${uuidv4()}_${String(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const destinationPath = `${folder}/${fileName}`;

    // Store a permanent public URL in the DB (never expires) instead of a
    // signed/expiring URL.
    const uploaded = await gcs.uploadPublicBuffer({
      buffer: file.buffer,
      destinationPath,
      contentType: file.mimetype,
    });

    const profilePic = uploaded.url;

    const updated = await userDetailsModel
      .findByIdAndUpdate(userId, { $set: { profilePic } }, { new: true })
      .select("-password");

    if (isUndefinedOrNull(updated)) {
      throw new Error("User profile not found");
    }

    await RedisCacheKey.deleteKey(getUserCacheKey(userId));

    return { message: "Profile picture updated successfully", data: updated };
  },

};

module.exports = userService;
