const mongoose = require("mongoose"),
  Schema = mongoose.Schema;
mongoose.Promise = global.Promise;

const {
  SERVER_STATUS,
  PLACEMENT_STATUS,
  PLACEMENT_FORMAT,
  TRANSPORT,
  DEFAULT_REV_SHARE,
} = require("./constant");

// A placement is a slot inside the publisher's MCP server where a sponsored
// block may be appended. The SDK sends `key` on every ad request.
const placementSchema = new Schema(
  {
    key: { type: String, required: true }, // e.g. "tool_footer"
    name: { type: String, default: null },
    format: { type: String, default: PLACEMENT_FORMAT.TEXT_CARD },
    status: { type: String, default: PLACEMENT_STATUS.ACTIVE },
    toolAllowlist: { type: [String], default: [] }, // [] = every tool
    toolCategoryMap: { type: Map, of: String, default: {} }, // tool name → category id
    frequency: {
      perSession: { type: Number, default: 1 },
      perHourPerSession: { type: Number, default: 3 },
    },
    floorCpc: { type: Number, default: 0 }, // USD
  },
  { _id: false }
);

// An MCP server registered by a supply (publisher) org.
const mcpServerSchema = new Schema(
  {
    orgId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: null },
    serverUrl: { type: String, default: null }, // remote MCP endpoint, if any (review only)
    homepage: { type: String, default: null }, // listing / docs / repo link (review only)
    transport: { type: String, default: TRANSPORT.STDIO },

    categories: { type: [String], default: [] }, // what the server is about
    blockedCategories: { type: [String], default: [] },
    blockedAdvertiserDomains: { type: [String], default: [] },
    blockedHosts: { type: [String], default: [] }, // MCP clientInfo.name values, e.g. "claude-ai"

    placements: { type: [placementSchema], default: [] },

    status: { type: String, default: SERVER_STATUS.DRAFT, index: true },
    reviewNotes: { type: String, default: null },
    revShare: { type: Number, default: DEFAULT_REV_SHARE }, // publisher's share of net revenue
    submittedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },

    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true }
);

// API keys the publisher's MCP server uses to call the bidder. Only the
// sha256 hash is stored; the secret is shown once at creation.
const mcpApiKeySchema = new Schema(
  {
    orgId: { type: String, required: true, index: true },
    mcpServerId: { type: String, required: true, index: true },
    mode: { type: String, required: true }, // test | live
    label: { type: String, default: null },
    prefix: { type: String, required: true }, // e.g. "mk_live_Ab12Cd34" — safe to display
    hash: { type: String, required: true, unique: true }, // sha256(secret) hex — bidder looks up by this
    status: { type: String, required: true },
    lastUsedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    createdBy: { type: String, default: null },
  },
  { timestamps: true }
);

const mcpServerModel =
  mongoose.models.mcpServerModel || mongoose.model("mcpServerModel", mcpServerSchema);
const mcpApiKeyModel =
  mongoose.models.mcpApiKeyModel || mongoose.model("mcpApiKeyModel", mcpApiKeySchema);

module.exports = { mcpServerModel, mcpApiKeyModel };
