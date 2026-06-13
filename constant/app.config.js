module.exports = {
    ALLOWED_ORIGIN: '*',

    ALLOWED_REQUEST_TYPES: [
        'POST', 'GET', 'PUT', 'DELETE', 'PATCH',
    ],

    ALLOWED_HEADERS: [
        // common headers
        'Accept',
        'Accept-Encoding',
        'Content-Encoding',
        'Accept-Language',
        'Origin',
        'Referer',
        'User-Agent',
        'Content-Type',

        // custom headers
        'authorization',
        'X-USER-TYPE',
        'x-org-id', // super-admin org context (impersonation)
    ],

    MAX_UPLOAD_SIZE: 2e+7, // ~ 20MB
};
