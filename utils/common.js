const _ = require('lodash');
const { isUndefinedOrNull } = require('./validators');

const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000);
}

const getSubdomain = (url) => {
    // below check is for dev
    if (isUndefinedOrNull(url) || url == `https://api.adsshare.in`) {
        return "ads";
    }
    // Regex to match subdomain
    const regex = /^(?:https?:\/\/)?([^./]+)\./i;
    const match = url.match(regex);

    // Extract and return the subdomain if it exists
    return _.get(match, '[1]', null);
}


module.exports = {
    generateOTP,
    getSubdomain
}