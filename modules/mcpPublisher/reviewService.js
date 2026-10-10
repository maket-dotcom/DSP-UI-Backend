const { mcpServerModel } = require("./model");
const organizationModel = require("../organization/model");
const { normalizeCreative } = require("./adCopy");
const campaignModel = require("../campaign/model");
const { TYPE: CAMPAIGN_TYPE, STATUS: CAMPAIGN_STATUS } = require("../campaign/constant");
const { SERVER_STATUS, REVIEW_DECISION, CAMPAIGN_REVIEW_STATUS } = require("./constant");
const { notifyMcpChanged } = require("./notify");
const { isUndefinedOrNull } = require("../../utils/validators");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Allowed super-admin transitions for an MCP server.
const SERVER_TRANSITIONS = {
  // Super admin may approve without waiting for the publisher to submit.
  [REVIEW_DECISION.APPROVE]: {
    from: [SERVER_STATUS.DRAFT, SERVER_STATUS.IN_REVIEW, SERVER_STATUS.REJECTED, SERVER_STATUS.SUSPENDED],
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
  // Cross-org list for the review queue; no status (or "all") = every
  // non-deleted server, waiting-for-review first.
  listServers: async ({ data }) => {
    const { page, limit, status, search } = data;
    const query = {
      status: !status || status === "all" ? { $ne: SERVER_STATUS.DELETED } : status,
    };
    if (!isUndefinedOrNull(search)) query.name = new RegExp(escapeRegex(search), "i");

    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      mcpServerModel.find(query).sort({ submittedAt: -1, createdAt: -1 }).skip(skip).limit(limit),
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

  // Cross-org list of campaigns the advertiser opted in to MCP, by review
  // status. Each row carries a suggested ad built from the campaign's
  // existing creative so super admin only has to tweak and approve.
  listCampaigns: async ({ data }) => {
    const { page, limit, reviewStatus } = data;
    const query = { mcpEnabled: true, status: { $ne: CAMPAIGN_STATUS.DELETED } };
    if (reviewStatus === "all") {
      // every opted-in campaign
    } else if (reviewStatus === CAMPAIGN_REVIEW_STATUS.PENDING) {
      query.$or = [{ "mcp.reviewStatus": reviewStatus }, { "mcp.reviewStatus": { $exists: false } }];
    } else {
      query["mcp.reviewStatus"] = reviewStatus;
    }
    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      campaignModel.find(query).sort({ mcpRequestedAt: 1, updatedAt: 1 }).skip(skip).limit(limit),
      campaignModel.countDocuments(query),
    ]);

    const orgIds = [...new Set(rows.map((c) => c.orgId).filter(Boolean))];
    const orgs = await organizationModel.find({ _id: { $in: orgIds } }, { name: 1 });
    const orgName = Object.fromEntries(orgs.map((o) => [String(o._id), o.name]));

    return {
      data: rows.map((c) => {
        const doc = c.toObject();
        return { ...doc, orgName: orgName[c.orgId] || null, suggestedMcp: suggestMcp(doc, orgName[c.orgId]) };
      }),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  // Save the MCP ad + targeting for an opted-in campaign. Does not change
  // the review decision; approve/reject is a separate call.
  saveCampaignConfig: async ({ id, data, reqBy }) => {
    const campaign = await campaignModel.findOne({ _id: id, mcpEnabled: true, status: { $ne: CAMPAIGN_STATUS.DELETED } });
    if (isUndefinedOrNull(campaign)) throw new Error("Campaign is not opted in to MCP: " + id);

    const creative = normalizeCreative(
      { ...data.creative, imageUrl: data.creative.imageUrl || null },
      { matchDomain: false }
    );
    const prev = campaign.mcp?.toObject?.() || {};
    const updated = await campaignModel.findOneAndUpdate(
      { _id: id },
      {
        $set: {
          mcp: {
            ...data,
            creative,
            reviewStatus: prev.reviewStatus || CAMPAIGN_REVIEW_STATUS.PENDING,
            reviewNotes: prev.reviewNotes || null,
            reviewedAt: prev.reviewedAt || null,
            reviewedBy: reqBy.user_id,
          },
        },
      },
      { new: true }
    );
    await notifyMcpChanged("campaign", updated._id);
    return { message: "MCP ad saved", data: updated };
  },

  decideCampaign: async ({ id, data, reqBy }) => {
    if (data.decision === REVIEW_DECISION.REJECT && isUndefinedOrNull(data.notes)) {
      throw new Error("notes are required when rejecting, so the advertiser knows what to fix");
    }
    const campaign = await campaignModel.findOne({ _id: id, mcpEnabled: true, status: { $ne: CAMPAIGN_STATUS.DELETED } });
    if (isUndefinedOrNull(campaign)) throw new Error("Campaign is not opted in to MCP: " + id);

    const m = campaign.mcp || {};
    if (
      data.decision === REVIEW_DECISION.APPROVE &&
      (!(m.bid > 0) || !m.categories?.length || !m.creative?.title || !m.creative?.destinationUrl)
    ) {
      throw new Error("Configure the MCP ad (bid, categories, copy, destination) before approving");
    }

    const reviewStatus =
      data.decision === REVIEW_DECISION.APPROVE
        ? CAMPAIGN_REVIEW_STATUS.APPROVED
        : CAMPAIGN_REVIEW_STATUS.REJECTED;
    const updated = await campaignModel.findOneAndUpdate(
      { _id: id },
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
    await notifyMcpChanged("campaign", updated._id);
    return { message: `MCP ad ${reviewStatus}`, data: updated };
  },
};

// Prefill for the review dialog, from what the advertiser already uploaded.
const suggestMcp = (c, orgName) => {
  const image = (c.media || []).find((m) => m.type !== "video" && m.link);
  const isApp = c.type === CAMPAIGN_TYPE.MOBILE;
  const destination = c.mcp?.creative?.destinationUrl || c.ctaUrl || "";
  return {
    bid: c.mcp?.bid ?? null,
    categories: c.mcp?.categories ?? [],
    keywords: c.mcp?.keywords ?? [],
    negativeKeywords: c.mcp?.negativeKeywords ?? [],
    intents: c.mcp?.intents ?? [],
    hosts: c.mcp?.hosts ?? [],
    frequencyCapPerSession: c.mcp?.frequencyCapPerSession ?? 1,
    dailyBudget: c.mcp?.dailyBudget ?? null,
    creative: {
      advertiser: c.mcp?.creative?.advertiser || c.appName || orgName || "",
      title: c.mcp?.creative?.title || (isApp && c.appName ? `Get ${c.appName}` : c.title || ""),
      description: c.mcp?.creative?.description || "",
      cta: c.mcp?.creative?.cta || (isApp ? "Install" : "Learn more"),
      destinationUrl: destination,
      displayDomain: c.mcp?.creative?.displayDomain || "",
      imageUrl: c.mcp?.creative?.imageUrl || image?.link || c.appIconLink || "",
    },
  };
};

module.exports = mcpReviewService;
