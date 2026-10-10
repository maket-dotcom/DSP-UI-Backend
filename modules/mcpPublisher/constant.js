require("dotenv").config();

module.exports = {
  SERVER_STATUS: {
    DRAFT: "draft", // created, not yet submitted
    IN_REVIEW: "in_review", // waiting on super admin
    LIVE: "live", // approved — live keys fill
    PAUSED: "paused", // publisher kill switch (was live)
    REJECTED: "rejected", // super admin rejected; publisher may edit + resubmit
    SUSPENDED: "suspended", // super admin pulled it; only super admin can reinstate
    DELETED: "deleted",
  },

  PLACEMENT_STATUS: {
    ACTIVE: "active",
    PAUSED: "paused",
  },

  PLACEMENT_FORMAT: {
    TEXT_CARD: "text_card", // sponsored text block appended to the tool result
    MCP_APP_CARD: "mcp_app_card", // ui:// resource on hosts that support MCP Apps
  },

  TRANSPORT: {
    STDIO: "stdio",
    HTTP: "http",
    BOTH: "both",
  },

  KEY_MODE: {
    TEST: "test", // always returns deterministic test ads, never billed
    LIVE: "live", // fills real campaigns once the server is live
  },

  KEY_STATUS: {
    ACTIVE: "active",
    REVOKED: "revoked",
  },

  REVIEW_DECISION: {
    APPROVE: "approve",
    REJECT: "reject",
    SUSPEND: "suspend",
  },

  CAMPAIGN_REVIEW_STATUS: {
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
  },

  DEFAULT_PLACEMENT: {
    key: "tool_footer",
    name: "Tool result footer",
    format: "text_card",
  },

  DEFAULT_REV_SHARE: 0.7,
  MAX_ACTIVE_KEYS_PER_MODE: 5,

  // Redis channel the MCP bidder subscribes to for index reloads.
  CHANGED_CHANNEL: process.env.MCP_CHANGED_CHANNEL || "mcp:changed",

  // Public HTTPS base URL of MCP-BID-BIDDER handed to publishers.
  BIDDER_PUBLIC_URL: process.env.MCP_BIDDER_PUBLIC_URL || "https://mcp-bid.example.com",
  SDK_GO_MODULE: "github.com/maket-dotcom/MCP-BID-BIDDER/sdk/go/mktool",

  // Contextual taxonomy shared by MCP servers (what they are about) and MCP
  // campaigns (what they target). Keep ids stable — the bidder indexes on them.
  CATEGORIES: [
    { id: "dev_tools", label: "Developer tools" },
    { id: "cloud_infra", label: "Cloud & infrastructure" },
    { id: "data_analytics", label: "Data & analytics" },
    { id: "marketing_analytics", label: "Marketing analytics & attribution" },
    { id: "adtech", label: "Advertising technology" },
    { id: "ecommerce", label: "E-commerce" },
    { id: "productivity", label: "Productivity & collaboration" },
    { id: "design", label: "Design & creative" },
    { id: "security", label: "Security" },
    { id: "ai_ml", label: "AI & machine learning" },
    { id: "crm_sales", label: "CRM & sales" },
    { id: "customer_support", label: "Customer support" },
    { id: "hr_recruiting", label: "HR & recruiting" },
    { id: "education", label: "Education & learning" },
    { id: "travel", label: "Travel" },
    { id: "food_delivery", label: "Food & delivery" },
    { id: "gaming", label: "Gaming" },
    { id: "media_entertainment", label: "Media & entertainment" },
    { id: "mobile_apps", label: "Mobile apps" },
    // Sensitive verticals: publishers must opt in (never filled by default).
    { id: "finance", label: "Finance & fintech", sensitive: true },
    { id: "crypto", label: "Crypto", sensitive: true },
    { id: "health", label: "Health", sensitive: true },
    { id: "gambling", label: "Gambling", sensitive: true },
    { id: "dating", label: "Dating", sensitive: true },
  ],

  INTENTS: ["how_to", "evaluate_solution", "troubleshoot", "buy", "learn"],

  CAMPAIGN_PRICING_MODEL: {
    CPC: "cpc",
  },
};
