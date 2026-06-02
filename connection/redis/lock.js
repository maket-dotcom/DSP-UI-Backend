const { RedisClient } = require("./common");

/**
 * Distributed lock helpers backed by Redis (SET NX PX + atomic compare-and-del).
 *
 * The shared client runs in legacyMode, so the promise API lives under
 * `RedisClient.v4`. Each acquisition gets a unique token so a holder can only
 * release its own lock (a lock that outlived its TTL must not be deleted by a
 * late releaser). Every lock carries a TTL so a crashed holder self-heals.
 */

// Lua: delete the key only if it still holds our token (atomic check-and-del).
const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end`;

const v4 = () => {
  if (!RedisClient || !RedisClient.v4) {
    throw new Error("Redis client (v4) not available");
  }
  return RedisClient.v4;
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const newToken = () =>
  `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

/**
 * Acquire a lock, retrying until it's free (serializing mutex) or the wait
 * window elapses.
 *
 * @param {string} key                lock key
 * @param {object} [opts]
 * @param {number} [opts.ttlMs=30000]  lock auto-expiry (must exceed expected work time)
 * @param {number} [opts.waitMs=35000] max time to keep retrying before giving up
 * @param {number} [opts.retryMs=100]  delay between attempts
 * @returns {Promise<string|null>}     the lock token, or null if not acquired within waitMs
 * @throws  if Redis is unreachable (caller decides the fallback)
 */
async function acquireLock(key, { ttlMs = 30000, waitMs = 35000, retryMs = 100 } = {}) {
  const client = v4();
  const token = newToken();
  const deadline = Date.now() + waitMs;

  // First attempt validates connectivity; a throw here means Redis is down and
  // propagates to the caller (for fallback). Subsequent retries are just waits.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const ok = await client.set(key, token, { NX: true, PX: ttlMs });
    if (ok === "OK") return token;
    if (Date.now() >= deadline) return null;
    await sleep(retryMs);
  }
}

/**
 * Release a lock previously acquired with acquireLock. Best-effort: a failure
 * here is non-fatal because the TTL will expire the lock anyway.
 *
 * @param {string} key
 * @param {string} token  the token returned by acquireLock
 */
async function releaseLock(key, token) {
  if (!token) return;
  try {
    await v4().eval(RELEASE_SCRIPT, { keys: [key], arguments: [token] });
  } catch (_) {
    // ignore — lock will self-expire via its TTL
  }
}

module.exports = {
  acquireLock,
  releaseLock,
};
