//const { Logger } = require('../../libs/logger');
const { isArray } = require('lodash');
const { RedisClient } = require('./common');

class ApplicationRedisCache {

    static async getValue(key) {
        return new Promise((resv, rej) => {
            RedisClient.get(key, (err, reply) => {
                if (err) rej(err);
                resv(reply);
            });
        });
    }

    static async setValue(key, value) {
        await RedisClient.set(key, value);
    }

    static async setValueForTime(key, value, time = (60 * 1000)) {
        await RedisClient.set(key, value, 'EX', time);
    }

    static async deleteKey(key) {
        return new Promise((resolve, reject) => {
            RedisClient.del(key, (err, reply) => {
                if (err) reject(err);
                resolve(reply === 1);
            });
        });
    }

    static async getKeysByPattern(pattern) {
        return new Promise((resolve, reject) => {
            RedisClient.keys(pattern, (err, keys) => {
                if (err) {
                    console.error(`An error encountered while fetching keys with pattern ${pattern}:`, err.message);
                    return reject(err);
                }
                resolve(keys);
            });
        });
    }

    static async getValuesOfArrayKeys(keys) {
        if (!isArray(keys) || keys.length <= 0) return [];
        return new Promise((resv, rej) => {
            RedisClient.mGet(keys, (err, values) => {
                if (err) {
                    console.error(`No values exists:`, err.message);
                    return rej(err);
                }
                resv(values);
            });
        });
    }
}

module.exports = ApplicationRedisCache;
