const { RedisClient, getHashset, deleteHashset } = require('./common');

async function setToken(id, token, time = 2.592e+6) { // 2.592e+6 -> 30 days
    const key = `authToken_${id}`;
    const result = await RedisClient.hSet(key, id, token);
    await RedisClient.expire(key, time);
    return result;
}

async function getToken(id) {
    const key = `authToken_${id}`;
    return getHashset(key, id);
}

async function validateToken(id, token) {
    const key = `authToken_${id}`;
    const redisStoredToken = await getHashset(key, id);
    return redisStoredToken === token;
}

async function deleteToken(id) {
    const key = `authToken_${id}`;
    const redisStoredToken = await deleteHashset(key, id);
    return !!redisStoredToken;
}

module.exports = {
    setToken,
    getToken,
    validateToken,
    deleteToken,
};
