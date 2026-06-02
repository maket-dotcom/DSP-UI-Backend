/* eslint-disable no-irregular-whitespace */
/* eslint-disable no-useless-escape */
const Regex = {
    name: /^[a-zA-Z]([.]?[a-zA-Z]?)*( [a-zA-Z]?([.]?[a-zA-Z]?)*)*$/,
    email: /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,20})+$/,
    companyName: /^([a-zA-Z0-9])([a-zA-Z0-9\s\.\,\/\&\-\(\)']?)*$/,
    mobile: /^[6789]\d{9}$/,
    keyword:
        /^([\s.\/&\-\(\)'[\]{\},\\]?)*([a-zA-Z0-9])([a-zA-Z0-9\s.\/&\-\(\)'[\]{\},\\]?)*$/,
    address: /^([a-zA-Z0-9\s\.\/\\\&\-\,\#\(\)']?)*$/,
    year: /^\d{4}$/,
    pincode: /^[1-9][0-9]{5}$/,
    otp: /^[0-9]+$/,
    pancard: /^[A-Za-z]{5}\d{4}[A-Za-z]{1}$/,
    aadharId: /^\d{12}$/,
    upi: /^.*@.*$/,
    url: /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.‌​-]+(:[0-9]+)?|(?:www‌​.|[-;:&=\+\$,\w]+@)[‌​A-Za-z0-9.-]+)((?:\/‌​[\+~%\/.\w-_]*)?\??(‌​?:[-\+=&;%@.\w_]*)#?‌​(?:[\w]*))?)/,
    gst: /^([0][1-9]|[1-2][0-9]|[3][0-7])([A-Za-z]{5})([0-9]{4})([A-Za-z]{1}[1-9]{1})([Zz]{1})([0-9A-Za-z]{1})$/,
    alphaNumericWithSpace: /^[a-zA-Z0-9 ]*$/,
    numberOnly: /^[0-9]*$/,
    floatedString: /^[0-9.]*$/,
    hexCode: /^#([A-Fa-f0-9]{3}){1,2}$/,
    bankAccount: /^[0-9]{9,18}$/,
    aadharNumber: /^[0-9]{12}$/,
};

const SPECIAL_CHAR_REGEX = /[^\w\d\s-]/g;
const SPECIAL_CHAR_REGEX_WITHOUT_PERCENT = /[^%\w\d\s-]/g;
const SPECIAL_CHAR_REGEX_FOR_SEO = /[\"\<\>]/g;
const SPECIAL_CHAR_REGEX_FOR_SEARCH = /[^\w\d\s\-\%\:\&\/]/g;
const ATLEAST_ONE_ALPHABET_REGEX = /.*[a-zA-Z]+.*/;
const PAGING_REGEX_QUERY = /page=[0-9]+/;
const PAGING_REGEX_QUERY_WITH_PAGE_SIZE = /page=[0-9]+&pageSize=[0-9]+/;
const MULTIPLE_SPACE_REGEX = /\s+/g;
const SINGLE_FILTER_REGEX = /^[A-Z_]+:.+$/g;
const VALIDATE_HOST_REGEX = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/;
const QS_REGEX = /^([\w-]+(=(.)*)?(&[\w-]+(=(.)*)?)*)?$/;

module.exports = {
    Regex,
    SPECIAL_CHAR_REGEX,
    SPECIAL_CHAR_REGEX_WITHOUT_PERCENT,
    SPECIAL_CHAR_REGEX_FOR_SEO,
    SPECIAL_CHAR_REGEX_FOR_SEARCH,
    ATLEAST_ONE_ALPHABET_REGEX,
    PAGING_REGEX_QUERY,
    PAGING_REGEX_QUERY_WITH_PAGE_SIZE,
    MULTIPLE_SPACE_REGEX,
    SINGLE_FILTER_REGEX,
    VALIDATE_HOST_REGEX,
    QS_REGEX,
};
