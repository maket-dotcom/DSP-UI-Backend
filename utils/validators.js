const { Regex } = require('../constant/regex');

const isBoolean = (value) => typeof value === 'boolean';

const isString = (value) => typeof value === 'string'
  || value instanceof String
  || Object.prototype.toString.call(value) === '[object String]';

const isNumber = (value) => typeof value === 'number';

const checkIfNumberUsingRegex = (value) => new RegExp(Regex.numberOnly).test(value);

const isInteger = (value) => {
    const x = parseFloat(value);
    // eslint-disable-next-line no-bitwise
    return !Number.isNaN(value) && (x | 0) === x;
};

const isFunction = (value) => typeof value === 'function';

const isUndefined = (value) => typeof value === 'undefined';

const isNull = (value) => value === null;

const isEmpty = (value) => value === '';

const isEmptyList = (value) => value.constructor !== Array || value.length === 0;

const isEmptyObject = (value) => {
    if (value === null) return true;
    if (isBoolean(value) || isNumber(value) || isFunction(value)) return false;
    if (value instanceof Set && !isUndefined(value.size) && value.size !== 0) return false;
    return Object.keys(value).length === 0;
};

const isStringAndNotEmpty = (value) => isString(value) && !isEmpty(value);

const isUndefinedOrNull = (value) => isUndefined(value) || isNull(value);

const isUndefinedOrNullOrEmpty = (value) => isUndefinedOrNull(value) || isEmpty(value);

const isUndefinedOrNullOrEmptyObject = (value) => isUndefinedOrNullOrEmpty(value) || isEmptyObject(value);

const isUndefinedOrNullOrEmptyList = (value) => isUndefinedOrNullOrEmpty(value) || isEmptyList(value);

const isUndefinedOrNullOrEmptyOrEmptyObjectOrEmptyList = (value) => isUndefinedOrNullOrEmpty(value) || isEmptyObject(value) || isUndefinedOrNullOrEmptyList(value);

const isMobileDevice = () => {
    if (isUndefinedOrNullOrEmptyObject(window)) return false;
    return !!window.matchMedia('only screen and (max-width: 760px)').matches;
};

const isValidDate = (d) => d instanceof Date && !Number.isNaN(d);

const isValidMobileNumber = (mobileNumber) => new RegExp(Regex.mobile).test(mobileNumber);

const isValidEmail = (email) => new RegExp(Regex.email).test(email);

const isValidPincode = (pincode) => new RegExp(Regex.pincode).test(pincode);

const isEqual = (firstArg, secondArg) => firstArg === secondArg;

const deepCopy = (obj) => JSON.parse(JSON.stringify(obj));

module.exports = {
    isBoolean,
    isString,
    isNumber,
    checkIfNumberUsingRegex,
    isInteger,
    isFunction,
    isUndefined,
    isNull,
    isEmpty,
    isEmptyList,
    isEmptyObject,
    isStringAndNotEmpty,
    isUndefinedOrNull,
    isUndefinedOrNullOrEmpty,
    isUndefinedOrNullOrEmptyObject,
    isUndefinedOrNullOrEmptyList,
    isUndefinedOrNullOrEmptyOrEmptyObjectOrEmptyList,
    isMobileDevice,
    isValidDate,
    isValidMobileNumber,
    isValidEmail,
    isValidPincode,
    isEqual,
    deepCopy,
};
