const { RedisClient } = require('./common');

async function setApiData(apiKey, data, time = 8640) { // 8640 -> 1 day
    const key = `_api_response_${apiKey}`;
    const result = await RedisClient.set(key, JSON.stringify(data));
    await RedisClient.expire(key, time);
    return result;
}

async function getApiData(apiKey) {
    const key = `_api_response_${apiKey}`;
    return new Promise((resolve, reject) => {
        try {
            RedisClient.get(key, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(JSON.parse(result));
                }
            });
        } catch (er) {
            reject(er);
        }
    });
}

module.exports = {
    setApiData,
    getApiData,
};
