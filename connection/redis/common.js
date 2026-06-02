const redis = require('redis');
// const { Logger } = require('../../libs/logger');
require("dotenv").config();
let redisClient = null;

//const { host, port, password } = config.get('redis');

const host = process.env.REDIS_HOST || 'localhost';
const port = process.env.REDIS_PORT;
const password = process.env.REDIS_PASSWORD;

(() => {
    try {
        // create client
        redisClient = redis.createClient({
            socket: {
                host,
                port,
            },
            password,
            legacyMode: true,
        });

        // add listeners
        redisClient
            .on('ready', () => {
                redisClient.set('LAST_UPTIME', new Date().getTime());
                //return Logger.info.bind(Logger, '[Redis] connected');
                console.log('[Redis] connected');
            })
            //.on('error', Logger.error.bind(Logger, '[Redis] connection: error'));
            .on('error', console.log('[Redis] connecttion: error'));
    } catch (error) {
        //Logger.error(`Error while creating redis client ${JSON.stringify(error)}`);
        console.log(`Error while creating redis client ${JSON.stringify(error)}`);
    }
})();

async function connect() {
    try {
        await redisClient.connect();
    } catch (error) {
        //Logger.error(`Error while connecting redis ${JSON.stringify(error)}`);
        console.log(`Error while creating redis client ${JSON.stringify(error)}`);
    }
}

async function closeConnection() {
    try {
        await redisClient.quit();
    } catch (error) {
        //Logger.error(`Error while quitting redis connection ${JSON.stringify(error)}`);
    }
}

async function setHashset(key, field, value) {
    const res = await redisClient.hSet(key, field, value);
    // await redisClient.expire(key, time);
    return res;
}

async function getHashset(key, field) {
    return new Promise((resolve, reject) => {
        try {
            redisClient.hGet(key, field, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        } catch (er) {
            reject(er);
        }
    });
}

async function deleteHashset(key, field) {
    return new Promise((resolve, reject) => {
        try {
            redisClient.hdel(key, field, (err, result) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(result);
                }
            });
        } catch (e) {
            reject(e);
        }
    });
}

async function getLastUptime() {
    return redisClient.get('LAST_UPTIME');
}

module.exports = {
    RedisClient: redisClient,
    connect,
    closeConnection,
    setHashset,
    getHashset,
    deleteHashset,
    getLastUptime,
};
