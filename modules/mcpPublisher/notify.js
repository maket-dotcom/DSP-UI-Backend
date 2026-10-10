const { RedisCacheKey } = require("../../connection/redis");
const { Logger } = require("../../logger");
const { CHANGED_CHANNEL } = require("./constant");

// Tell the MCP bidder something it indexes changed so it reloads right away
// (it also reloads on an interval, so a lost message only delays the change).
const notifyMcpChanged = async (type, id) => {
  try {
    await RedisCacheKey.publish(
      CHANGED_CHANNEL,
      JSON.stringify({ type, id: String(id), at: Date.now() })
    );
  } catch (e) {
    Logger.error(`[mcp] publish ${CHANGED_CHANNEL} failed: ${e.message}`);
  }
};

module.exports = { notifyMcpChanged };
