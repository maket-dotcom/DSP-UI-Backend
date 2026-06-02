const { RedisClient } = require('./common');

async function setOtp(mobile, otp, time = 1.8e3) { // 1.8e3 -> 30 minutes
    const key = `otp_${mobile}`;
    const result = await RedisClient.hSet(key, mobile, otp);
    await RedisClient.expire(key, time);
    return result;
}

async function getOtp(mobile) {
    if (mobile == 9999999999) return 999999;
    const key = `otp_${mobile}`;
    return new Promise((resolve, reject) => {
        try {
            RedisClient.hGet(key, mobile, (err, result) => {
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

async function deleteOtp(mobile) {
    const key = `otp_${mobile}`;
    return new Promise((resolve, reject) => {
        try {
            RedisClient.hDel(key, mobile, (err, data) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(data);
                }
            });
        } catch (er) {
            reject(er);
        }
    });
}

async function deleteOtpSilently(mobile) {
    try {
        return deleteOtp(mobile);
    } catch (er) {
        //Logger.error(`Error while deleting otp, ${er.message}`);
        return null;
    }
}

module.exports = {
    setOtp,
    getOtp,
    deleteOtp,
    deleteOtpSilently,
};
