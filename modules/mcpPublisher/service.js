const crypto = require("crypto");
const { mcpServerModel, mcpApiKeyModel } = require("./model");
const {
  SERVER_STATUS,
  KEY_MODE,
  KEY_STATUS,
  DEFAULT_PLACEMENT,
  MAX_ACTIVE_KEYS_PER_MODE,
  BIDDER_PUBLIC_URL,
  SDK_GO_MODULE,
  CATEGORIES,
  INTENTS,
} = require("./constant");
const { notifyMcpChanged } = require("./notify");
const { isUndefinedOrNull } = require("../../utils/validators");

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Publisher-editable statuses. A suspended server is frozen until super admin
// reinstates it; in_review is frozen so review sees a stable config.
const EDITABLE = [
  SERVER_STATUS.DRAFT,
  SERVER_STATUS.REJECTED,
  SERVER_STATUS.LIVE,
  SERVER_STATUS.PAUSED,
];

const findOwnServer = async ({ id, reqBy }) => {
  const server = await mcpServerModel.findOne({
    _id: id,
    orgId: reqBy.org_id,
    status: { $ne: SERVER_STATUS.DELETED },
  });
  if (isUndefinedOrNull(server)) throw new Error("Invalid MCP server id " + id);
  return server;
};

// Every tool named in toolCategoryMap must be allowed by the placement.
const assertPlacementsConsistent = (placements = []) => {
  for (const p of placements) {
    const allow = p.toolAllowlist || [];
    if (allow.length === 0) continue;
    const mapped = Object.keys(p.toolCategoryMap || {});
    const stray = mapped.filter((t) => !allow.includes(t));
    if (stray.length) {
      throw new Error(
        `placement "${p.key}": toolCategoryMap has tools missing from toolAllowlist: ${stray.join(", ")}`
      );
    }
  }
};

// Key format: mk_<mode>_<32 url-safe chars>. Only the sha256 is persisted.
const generateKey = (mode) => {
  const secret = `mk_${mode}_${crypto.randomBytes(24).toString("base64url")}`;
  return {
    secret,
    prefix: secret.slice(0, `mk_${mode}_`.length + 8),
    hash: crypto.createHash("sha256").update(secret).digest("hex"),
  };
};

const publicKey = (k) => ({
  _id: k._id,
  mode: k.mode,
  label: k.label,
  prefix: k.prefix,
  status: k.status,
  lastUsedAt: k.lastUsedAt,
  revokedAt: k.revokedAt,
  createdAt: k.createdAt,
});

const goSnippet = (placementKey) => `import "${SDK_GO_MODULE}"

ads := mktool.New(mktool.Config{
    APIKey:      os.Getenv("MKTOOL_API_KEY"),      // mk_test_... or mk_live_...
    Endpoint:    os.Getenv("MKTOOL_ENDPOINT"),     // ${BIDDER_PUBLIC_URL}
    Placement:   "${placementKey}",
    SessionSalt: os.Getenv("MKTOOL_SESSION_SALT"), // any random 32+ char secret
})
defer ads.Close()

s := server.NewMCPServer("your-server", "1.0.0",
    server.WithToolHandlerMiddleware(ads.Middleware()),
)`;

const mcpPublisherService = {
  listCategories: async () => ({ data: { categories: CATEGORIES, intents: INTENTS } }),

  listServers: async ({ data, reqBy }) => {
    const { page, limit, status, search } = data;
    const query = { orgId: reqBy.org_id };
    query.status = isUndefinedOrNull(status) ? { $ne: SERVER_STATUS.DELETED } : status;
    if (!isUndefinedOrNull(search)) query.name = new RegExp(escapeRegex(search), "i");

    const skip = (page - 1) * limit;
    const [rows, total] = await Promise.all([
      mcpServerModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      mcpServerModel.countDocuments(query),
    ]);
    return {
      data: rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    };
  },

  getServer: async ({ id, reqBy }) => {
    const server = await findOwnServer({ id, reqBy });
    return { data: server };
  },

  createServer: async ({ data, reqBy }) => {
    const placements =
      Array.isArray(data.placements) && data.placements.length
        ? data.placements
        : [{ ...DEFAULT_PLACEMENT }];
    assertPlacementsConsistent(placements);

    const server = new mcpServerModel({
      ...data,
      placements,
      orgId: reqBy.org_id,
      status: SERVER_STATUS.DRAFT,
      createdBy: reqBy.user_id,
      updatedBy: reqBy.user_id,
    });
    const saved = await server.save();
    await notifyMcpChanged("mcp_server", saved._id);
    return { message: "MCP server created. Create a test key to start integrating.", data: saved };
  },

  updateServer: async ({ id, data, reqBy }) => {
    const server = await findOwnServer({ id, reqBy });
    if (!EDITABLE.includes(server.status)) {
      throw new Error(`MCP server cannot be edited while ${server.status}`);
    }
    if (data.placements) assertPlacementsConsistent(data.placements);

    const updated = await mcpServerModel.findOneAndUpdate(
      { _id: server._id },
      { $set: { ...data, updatedBy: reqBy.user_id } },
      { new: true }
    );
    await notifyMcpChanged("mcp_server", updated._id);
    return { message: "MCP server updated successfully", data: updated };
  },

  // draft/rejected -> in_review
  submitServer: async ({ id, reqBy }) => {
    const server = await findOwnServer({ id, reqBy });
    if (![SERVER_STATUS.DRAFT, SERVER_STATUS.REJECTED].includes(server.status)) {
      throw new Error(`Only draft or rejected servers can be submitted (current: ${server.status})`);
    }
    if (!server.categories?.length) throw new Error("Add at least one category before submitting");
    if (!server.placements?.length) throw new Error("Add at least one placement before submitting");

    server.status = SERVER_STATUS.IN_REVIEW;
    server.submittedAt = new Date();
    server.updatedBy = reqBy.user_id;
    const saved = await server.save();
    await notifyMcpChanged("mcp_server", saved._id);
    return { message: "Submitted for review", data: saved };
  },

  // publisher kill switch: live <-> paused (only for servers already approved)
  changeStatus: async ({ id, data, reqBy }) => {
    const server = await findOwnServer({ id, reqBy });
    const allowed =
      (server.status === SERVER_STATUS.LIVE && data.status === SERVER_STATUS.PAUSED) ||
      (server.status === SERVER_STATUS.PAUSED && data.status === SERVER_STATUS.LIVE);
    if (!allowed) {
      throw new Error(`Cannot change status from ${server.status} to ${data.status}`);
    }
    server.status = data.status;
    server.updatedBy = reqBy.user_id;
    const saved = await server.save();
    await notifyMcpChanged("mcp_server", saved._id);
    return { message: `MCP server ${data.status}`, data: { id: saved._id, status: saved.status } };
  },

  // soft delete + revoke every key so the bidder stops accepting them
  deleteServer: async ({ id, reqBy }) => {
    const server = await findOwnServer({ id, reqBy });
    server.status = SERVER_STATUS.DELETED;
    server.updatedBy = reqBy.user_id;
    await server.save();
    await mcpApiKeyModel.updateMany(
      { mcpServerId: String(server._id), status: KEY_STATUS.ACTIVE },
      { $set: { status: KEY_STATUS.REVOKED, revokedAt: new Date() } }
    );
    await notifyMcpChanged("mcp_server", server._id);
    return { message: "MCP server deleted successfully" };
  },

  listKeys: async ({ id, reqBy }) => {
    const server = await findOwnServer({ id, reqBy });
    const keys = await mcpApiKeyModel
      .find({ mcpServerId: String(server._id) })
      .sort({ createdAt: -1 });
    return { data: keys.map(publicKey) };
  },

  // Returns the secret exactly once.
  createKey: async ({ id, data, reqBy }) => {
    const server = await findOwnServer({ id, reqBy });
    const active = await mcpApiKeyModel.countDocuments({
      mcpServerId: String(server._id),
      mode: data.mode,
      status: KEY_STATUS.ACTIVE,
    });
    if (active >= MAX_ACTIVE_KEYS_PER_MODE) {
      throw new Error(
        `At most ${MAX_ACTIVE_KEYS_PER_MODE} active ${data.mode} keys per server. Revoke one first.`
      );
    }

    const { secret, prefix, hash } = generateKey(data.mode);
    const key = await mcpApiKeyModel.create({
      orgId: reqBy.org_id,
      mcpServerId: String(server._id),
      mode: data.mode,
      label: data.label || null,
      prefix,
      hash,
      status: KEY_STATUS.ACTIVE,
      createdBy: reqBy.user_id,
    });
    await notifyMcpChanged("mcp_api_key", key._id);

    const note =
      data.mode === KEY_MODE.LIVE && server.status !== SERVER_STATUS.LIVE
        ? "Live key created. It returns no ads until this server is approved."
        : "Key created.";
    return {
      message: `${note} Copy it now — it will not be shown again.`,
      data: { ...publicKey(key), secret },
    };
  },

  revokeKey: async ({ id, keyId, reqBy }) => {
    const server = await findOwnServer({ id, reqBy });
    const key = await mcpApiKeyModel.findOneAndUpdate(
      { _id: keyId, mcpServerId: String(server._id), status: KEY_STATUS.ACTIVE },
      { $set: { status: KEY_STATUS.REVOKED, revokedAt: new Date() } },
      { new: true }
    );
    if (isUndefinedOrNull(key)) throw new Error("Invalid or already revoked key " + keyId);
    await notifyMcpChanged("mcp_api_key", key._id);
    return { message: "Key revoked", data: publicKey(key) };
  },

  // Everything the "Monetize your MCP" screen needs to wire up the SDK.
  getIntegration: async ({ id, reqBy }) => {
    const server = await findOwnServer({ id, reqBy });
    const keys = await mcpApiKeyModel
      .find({ mcpServerId: String(server._id), status: KEY_STATUS.ACTIVE })
      .sort({ createdAt: -1 });
    const firstPlacement = server.placements?.[0]?.key || DEFAULT_PLACEMENT.key;

    return {
      data: {
        serverId: server._id,
        status: server.status,
        liveFilling: server.status === SERVER_STATUS.LIVE,
        bidderUrl: BIDDER_PUBLIC_URL,
        endpoints: {
          select: `${BIDDER_PUBLIC_URL}/v1/ads/select`,
          rendered: `${BIDDER_PUBLIC_URL}/v1/events/rendered`,
        },
        auth: "Authorization: Bearer <MKTOOL_API_KEY>",
        placements: (server.placements || []).map((p) => ({ key: p.key, name: p.name, status: p.status })),
        keys: keys.map(publicKey),
        env: {
          MKTOOL_ENDPOINT: BIDDER_PUBLIC_URL,
          MKTOOL_API_KEY: "<your mk_test_ or mk_live_ key>",
          MKTOOL_SESSION_SALT: "<random 32+ char secret>",
        },
        sdk: {
          go: {
            install: `go get ${SDK_GO_MODULE}@latest`,
            snippet: goSnippet(firstPlacement),
          },
        },
      },
    };
  },
};

module.exports = mcpPublisherService;
