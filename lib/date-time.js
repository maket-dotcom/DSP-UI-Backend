const _ = require("lodash");
const moment = require("moment-timezone");
const util = require("util");

const convertDurationUnitToShortForm = (duration = 1, unit = "day") => {
    let map = {"hour": "h", "day": "d", "month": "m"};
    let str = map[unit] || "h";
    return `${duration}${str}`;
}

const validDurationForUnit = (duration = 0, unit = "lifetime") => {
    switch (unit) {
        case "hour":
            if (duration > 24) duration = 24;
            else if (duration <= 0) duration = 1;
            break;
        case "day":
            if (duration > 30) duration = 30;
            else if (duration <= 0) duration = 1;
            break;
        case "month":
            if (duration > 12) duration = 12;
            else if (duration <= 0) duration = 1;
            break;
        case "lifetime":
        default:
            duration = -1;
    }
    return duration;
}

const getSecondForDuration = (duration = 0, unit = "lifetime") => {
    let seconds = -1;
    if (duration <= 0) return seconds;
    switch (unit) {
        case "hour":
            if (duration > 24) duration = 24;
            seconds = 60 * 60 * duration;
            break;
        case "day":
            if (duration > 30) duration = 30;
            seconds = 60 * 60 * 24 * duration;
            break;
        case "month":
            if (duration > 12) duration = 12;
            seconds = 60 * 60 * 24 * 30 * duration;
            break;
        case "lifetime":
        default:
            seconds = -1;
            break;
    }
    return seconds;
}

const getMilliSecondForDuration = (duration = 0, unit = "lifetime") => {
    let milliseconds = -1;
    if (duration <= 0 || unit == "lifetime") return milliseconds;
    milliseconds = getSecondForDuration(duration, unit) * 1000;
    return milliseconds;
}

const validateDateFormat = (date, format = "YYYY-MM-DD") => {
    let momentDate = moment(date, format, true);
    return momentDate.isValid();
}

const validateTimeFormat = (time, format = "HH:mm:ss") => {
    let momentTime = moment(time, format, true);
    return momentTime.isValid();
}

const getToday = (timezone = "UTC", returnMomentObj = false) => {
    return returnMomentObj ? moment().tz(timezone) : moment().tz(timezone).format();
}

const getYesterday = (timezone = "UTC", returnMomentObj = false) => {
    return returnMomentObj ? moment().tz(timezone).subtract(1, "days") : moment().tz(timezone).subtract(1, "days").format();
}

const getUTCOffset = (date) => {
    return moment(date).utcOffset();
}

const getUnix = (date, returnInMs = false) => {
    return returnInMs ? moment(date).valueOf() : moment(date).unix();
}

const getDateFromSecond = (seconds, toUTC = false) => {
    return toUTC ? moment.unix(seconds).utc().format() : moment.unix(seconds).format()
}

const getDateFromTime = (hour = 0, minute = 0, second = 0, toUTC = false) => {
    return toUTC ? moment().utc().hour(hour).minute(minute).second(second).format() : moment().hour(hour).minute(minute).second(second).format();
}

const format = (date, format = "YYYY-MM-DD", parsingTimezone = null) => {
    if (parsingTimezone) {
        return format ? moment.tz(date, parsingTimezone).format(format) : moment.tz(date, parsingTimezone).format();
    }
    return format ? moment(date).format(format) : moment(date).format();
}

const parse = (date, timezone = "UTC", returnMomentObj = false) => {
    return returnMomentObj ? moment.tz(date, timezone) : moment.tz(date, timezone).format();
}

const toUTC = (date, parsingTimeZone = "UTC") => {
    return moment.tz(date, parsingTimeZone).utc().format();
}

const toTimezone = (date, timezone = "UTC") => {
    return moment(date).tz(timezone).format();
}

const dateRange = (start, end, parsingTimezone = "UTC", returnMomentDate = false) => {
    let startDt = moment.tz(start, parsingTimezone).hour(0).minute(0).seconds(0).millisecond(0);
    let endDt = moment.tz(end, parsingTimezone).hour(23).minute(59).seconds(59).millisecond(999);
    if (returnMomentDate) {
        return { start: startDt, end: endDt };
    }
    return { start: startDt.toDate(), end: endDt.toDate() };
}

const getDayEndDateTime = (dt, parsingTimezone = "UTC", returnMomentDate = false) => {
    let endDT = moment.tz(dt, parsingTimezone).hour(23).minute(59).seconds(59).millisecond(999);
    return returnMomentDate ? endDT : endDT.toDate();
}

const seconds = (date, timezone = "UTC") => {
    return moment.tz(date, timezone).unix();
}

const getDateRanges = (start, end, format = "YYYY-MM-DD", timezone = "UTC") => {
    let dateArray = [];
    let currentDate = moment.tz(start, timezone);
    let endDate = moment.tz(end, timezone);
    while (currentDate <= endDate) {
        dateArray.push(currentDate.format(format));
        currentDate = moment.tz(currentDate, timezone).add(1, "days");
    }
    return dateArray;
}


const parseInUTC = (dt) => {
    return moment.utc(dt);
}

const convertToTimezone = (dt, parsingTimezone = "UTC", convertToTimezone = "UTC") => {
    return moment.tz(dt, parsingTimezone).tz(convertToTimezone);
}

const add = (dtObj, duration, durationUnit = "days") => {
    return dtObj.add(duration, durationUnit);
}

const addToISODate = (date, duration, durationUnit = "days", timezone = "UTC") => {
    return moment(date).add(duration, durationUnit).tz(timezone).format();
}

const subtract = (dtObj, duration, durationUnit = "days") => {
    return dtObj.subtract(duration, durationUnit);
}

const diff = (date1, date2, durationUnit = "days") => {
    return moment(date1).diff(moment(date2), durationUnit);
}


const isDayChanged = (timezone) => {
    let dayChanged = false;

    let utcDT = getToday("UTC");
    let appDT = getToday(timezone);

    let offset = getUTCOffset(appDT);
    let appDate = format(getDateFromSecond(getUnix(appDT) + offset, true), "YYYY-MM-DD");

    if (offset > 0) {
        if (appDate !== format(utcDT, "YYYY-MM-DD")) {
            dayChanged = true;
        }
    } else if (offset == 0) {
        let expectedTime = getDateFromTime(0, 9, 0, true);
        if (getUnix(utcDT) > getUnix(expectedTime)) {
            dayChanged = true;
        }
    } else {
        if (appDate == format(utcDT, "YYYY-MM-DD")) {
            dayChanged = true;
        }
    }

    return dayChanged;
}

const startOf = (unit = "month", inTimezone = "UTC", returnMomentObj = false) => {
    if (returnMomentObj) {
        return moment().tz(inTimezone).startOf(unit);
    }
    return moment().tz(inTimezone).startOf(unit).format();
}

const endOf = (unit = "month", inTimezone = "UTC", returnMomentObj = false) => {
    if (returnMomentObj) {
        return moment().tz(inTimezone).endOf(unit);
    }
    return moment().tz(inTimezone).endOf(unit).format();
}

const getSupportedTimezones = () => {
    return moment.tz.names();
}

const convertSecondtoHumanReadableFormat = (seconds) => {
    seconds = _.parseInt(seconds);
    let days = _.parseInt(seconds / (24 * 3600));
    seconds = seconds % (24 * 3600);
    let hours = _.parseInt(seconds / 3600);
    seconds = seconds % 3600;
    let minutes = _.parseInt(seconds / 60);
    seconds = seconds % 60;
    
    let stringFormat = "";
    if (days > 0) {
        stringFormat = util.format("%d days ", days);
    }
    if (hours > 0) {
        stringFormat += util.format("%d hours ", hours);
    }
    if (minutes > 0) {
        stringFormat += util.format("%d minutes ", minutes);
    }
    if (seconds > 0) {
        stringFormat += util.format("%d seconds ", seconds);
    }
    return stringFormat;
}

const convertTimezoneToUTCForRangeQuery = ({startDate, endDate, timezone = "UTC", format = "YYYY-MM-DD"}) => {
    // Parse start and end dates in the specified timezone
    let startMomentTZ = moment.tz(startDate, format, timezone).startOf('day');
    let endMomentTZ = moment.tz(endDate, format, timezone).endOf('day');

    // Convert them to UTC and format as ISO 8601 strings
    let startMomentUTC = startMomentTZ.clone().tz("UTC").format();
    let endMomentUTC = endMomentTZ.clone().tz("UTC").format();

    return { startUTC: startMomentUTC, endUTC: endMomentUTC };
}

const getTodayStartDateTimezoneToUTC = ({timezone = "UTC"}) => {
    return moment().tz(timezone).startOf('day').format("YYYY-MM-DD");
}

const getTodayEndDateTimezoneToUTC = ({timezone = "UTC"}) => {
    return moment().tz(timezone).endOf('day').format("YYYY-MM-DD");
}

const get10DaysBackFromtoday = ({timezone = "UTC"}) => {
    return moment().tz(timezone).subtract(10, "days").startOf('day').format("YYYY-MM-DD");
}

const DateTime = {
    convertTimezoneToUTCForRangeQuery,
    getTodayEndDateTimezoneToUTC,
    getTodayStartDateTimezoneToUTC,
    get10DaysBackFromtoday
}

module.exports = DateTime;