const { isUndefinedOrNullOrEmpty } = require('./validators');

function flattenObject(obj, prefix = '') {
    const flattenedObj = {};
    Object.keys(obj).forEach((key) => {
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            Object.assign(flattenedObj, flattenObject(obj[key], `${prefix}${key}.`));
        } else {
            flattenedObj[`${prefix}${key}`] = obj[key];
        }
    });
    return flattenedObj;
}

/**
 * Search for the value matching a path in dotted notation
 * inside an object.
 *
 * @example
 * - getValueByPath({a: {b: 2}}, 'a.b') -> 2
 * - getValueByPath({}, 'a.b') -> undefined
 * @param {Object} obj Nested object to search.
 * @param {string} path Path of the value to search for.
 * @return {*} Matching value, or undefined if none.
 */
function getValueByPath(obj, path) {
    const segments = path.split('.');
    let result = obj;

    for (let i = 0; i < segments.length && result !== null && result !== undefined; i += 1) {
        result = result[segments[i]];
    }

    return result;
}

function parseObject(obj) {
    const parsedObj = {};
    if (typeof obj !== 'object') return obj;
    Object.keys(obj).forEach((key) => {
        const val = obj[key];

        const skipParsing = ['number', 'boolean', 'bigint', 'symbol'].includes(typeof val);

        if (val === null || val === undefined) {
            parsedObj[key] = null;
        } else if (skipParsing) {
            parsedObj[key] = val;
        } else if (typeof val === 'string') {
            if (val === 'true' || val === 'false') {
                parsedObj[key] = val === 'true';
            } else if (!Number.isNaN(val)) {
                parsedObj[key] = parseFloat(val);
            } else {
                const dateVal = new Date(val);
                if (!Number.isNaN(dateVal.getTime())) {
                    parsedObj[key] = dateVal;
                } else {
                    parsedObj[key] = val;
                }
            }
        } else if (Array.isArray(val)) {
            parsedObj[key] = val.map((v) => parseObject(v));
        } else if (typeof val === 'object') {
            parsedObj[key] = parseObject(val);
        } else {
            throw new Error(`Unrecognized data type for key ${key}`);
        }
    });
    return parsedObj;
}

function copyByKeys(src, dest, keys) {
    const res = dest || {};
    if (!src) return res;
    (keys || Object.keys(src)).forEach((key) => {
        res[key] = src[key];
    });
    return res;
}

module.exports = {
    flattenObject,
    getValueByPath,
    parseObject,
    copyByKeys,
};
