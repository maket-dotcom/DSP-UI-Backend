module.exports = {
  // approval.status on campaigns, line items and creatives. Missing = approved
  // (records from before approvals). Only approved items bid, and only once
  // the super admin has turned bidding on for the campaign.
  STATUS: {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
  },

  KIND: {
    CAMPAIGN: "campaign",
    LINE_ITEM: "lineItem",
    CREATIVE: "creative",
  },

  DECISION: {
    APPROVE: "approve",
    REJECT: "reject",
  },

  // Edits a network may make without sending the item back for approval.
  // Any other change (budget, bid, targeting, flights, dates, creatives,
  // landing URL, …) needs the org's approval again.
  MINOR_FIELDS: {
    campaign: ["title", "notes", "alternativeId", "status", "kpi", "appIconLink", "mmpPlatform"],
    lineItem: ["name", "notes", "alternativeId", "status", "pacing"],
    creative: ["name", "status"],
  },
};
