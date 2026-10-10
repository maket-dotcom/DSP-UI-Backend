const { mcpServerModel } = require("./model");
const campaignModel = require("../campaign/model");
const { TYPE: CAMPAIGN_TYPE, STATUS: CAMPAIGN_STATUS } = require("../campaign/constant");
const { SERVER_STATUS, REVIEW_DECISION, CAMPAIGN_REVIEW_STATUS } = require("./constant");
const { notifyMcpChanged } = require("./notify");
const { isUndefinedOrNull } = require("../../utils/validators");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Allowed super-admin transitions for an MCP server.
const SERVER_TRANSITIONS = {
  [REVIEW_DECISION.APPROVE]: {
    from: [SERVER_STATUS.IN_REVIEW, SERVER_STATUS.SUSPENDED],
    to: SERVER_STATUS.LIVE,
  },
  [REVIEW_DECISION.REJECT]: {
    from: [SERVER_STATUS.IN_REVIEW],
    to: SERVER_STATUS.REJECTED,
  },
  [REVIEW_DECISION.SUSPEND]: {
    from: [SERVER_STATUS.LIVE, SERVER_STATUS.PAUSED],
    to: SERVER_STATUS.SUSPENDED,
  },
};

const mcpReviewService = {
  // Cross-org list for the review queue (defaults to in_review).
  listServers: async ({ data }) => {
    const { page, limit, status, search } = data;
    const query = { status: status || SERVER_STATUS.IN_REVIEW };
    if (!isUndefinedOrNull(search)) query.name = new RegExp(escapeRegex(search), "i");

    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      mcpServerModel.find(query).sort({ submittedAt: 1, createdAt: 1 }).skip(skip).limit(limit),
      mcpServerModel.countDocuments(query),
    ]);
    return {
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  decideServer: async ({ id, data, reqBy }) => {
    const server = await mcpServerModel.findById(id);
    if (isUndefinedOrNull(server) || server.status === SERVER_STATUS.DELETED) {
      throw new Error("Invalid MCP server id " + id);
    }
    const rule = SERVER_TRANSITIONS[data.decision];
    if (!rule.from.includes(server.status)) {
      throw new Error(`Cannot ${data.decision} a server that is ${server.status}`);
    }
    if (data.decision === REVIEW_DECISION.REJECT && isUndefinedOrNull(data.notes)) {
      throw new Error("notes are required when rejecting, so the publisher knows what to fix");
    }

    server.status = rule.to;
    server.reviewNotes = data.notes || null;
    if (!isUndefinedOrNull(data.revShare)) server.revShare = data.revShare;
    if (rule.to === SERVER_STATUS.LIVE && isUndefinedOrNull(server.approvedAt)) {
      server.approvedAt = new Date();
    }
    server.updatedBy = reqBy.user_id;
    const saved = await server.save();
    await notifyMcpChanged("mcp_server", saved._id);
    return { message: `MCP server ${saved.status}`, data: saved };
  },

  // Cross-org list of MCP campaigns by creative review status.
  listCampaigns: async ({ data }) => {
    const { page, limit, reviewStatus } = data;
    const query = {
      type: CAMPAIGN_TYPE.MCP,
      status: { $ne: CAMPAIGN_STATUS.DELETED },
      "mcp.reviewStatus": reviewStatus,
    };
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      campaignModel.find(query).sort({ updatedAt: 1 }).skip(skip).limit(limit),
      campaignModel.countDocuments(query),
    ]);
    return {
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  decideCampaign: async ({ id, data, reqBy }) => {
    if (data.decision === REVIEW_DECISION.REJECT && isUndefinedOrNull(data.notes)) {
      throw new Error("notes are required when rejecting, so the advertiser knows what to fix");
    }
    const reviewStatus =
      data.decision === REVIEW_DECISION.APPROVE
        ? CAMPAIGN_REVIEW_STATUS.APPROVED
        : CAMPAIGN_REVIEW_STATUS.REJECTED;

    const updated = await campaignModel.findOneAndUpdate(
      { _id: id, type: CAMPAIGN_TYPE.MCP, status: { $ne: CAMPAIGN_STATUS.DELETED } },
      {
        $set: {
          "mcp.reviewStatus": reviewStatus,
          "mcp.reviewNotes": data.notes || null,
          "mcp.reviewedAt": new Date(),
          "mcp.reviewedBy": reqBy.user_id,
        },
      },
      { new: true }
    );
    if (isUndefinedOrNull(updated)) throw new Error("Invalid MCP campaign id " + id);
    await notifyMcpChanged("campaign", updated._id);
    return { message: `Campaign creative ${reviewStatus}`, data: updated };
  },
};

module.exports = mcpReviewService;
