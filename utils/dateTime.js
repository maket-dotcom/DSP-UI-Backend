const moment = require('moment-timezone');

function convertToUTCStartOfDay(dateString, timezone) {
    return moment.tz(dateString, "YYYY-MM-DD", timezone)
        .startOf('day')
        .utc()
        .toDate();
}

function convertToUTCEndOfDay(dateString, timezone) {
    return moment.tz(dateString, "YYYY-MM-DD", timezone)
        .endOf('day')
        .utc()
        .toDate();
}

module.exports = {
    convertToUTCStartOfDay,
    convertToUTCEndOfDay
}