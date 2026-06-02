const fs = require('fs');
const _ = require('lodash');
const { format, createLogger, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const { getColoredLabel } = require('../utils/chalkss');
const { flattenObject } = require('../utils/object');
const { isUndefinedOrNullOrEmptyList } = require('../utils/validators');
require("dotenv").config();

const {
    combine,
    timestamp,
    printf, // label,
    // colorize,
    prettyPrint,
} = format;

const logDir = 'logs';

if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const isDevEnv = process.env.MODE === 'development';

const Logger = createLogger({
    // level: 'debug',
    format: combine(
        timestamp({ format: 'DD/MM/YY HH:mm:ss.SSS' }),
        // colorize({ level: true }),
        prettyPrint({ depth: 10, color: true }),
        printf(({
            timestamp: timestamp3, level, message, errorMessage, ...messages
        }) => {
            const messageArray = [
                timestamp3,
                getColoredLabel(level, level),
                message,
                getColoredLabel('error', errorMessage),
            ];
            const normalizedComplexMessages = Object.entries(flattenObject(_.cloneDeep(messages))).map(([key, value]) => `${key}: ${value}`);
            if (!isUndefinedOrNullOrEmptyList(normalizedComplexMessages)) messageArray.push(normalizedComplexMessages.join(','));
            return messageArray.join(' | ');
        }),
    ),
    transports: [
        new DailyRotateFile({
            name: 'all-logs',
            filename: `${logDir}/%DATE%-web.log`,
            datePattern: 'YYYY-MM-DD',
            prepend: true,
            json: true,
            maxFiles: 2,
        }),
        new DailyRotateFile({
            name: 'error-logs',
            filename: `${logDir}/%DATE%-error.log`,
            datePattern: 'YYYY-MM-DD',
            prepend: true,
            level: 'error',
            json: true,
            maxFiles: 2,
        }),
        new transports.Console({
            level: 'debug',
            handleExceptions: true,
            colorize: true,
        }),
    ],
    exitOnError: false,
});

if (!isDevEnv) Logger.remove(transports.Console);

Logger.on('error', (err) => console.error(err));

if (!Logger.stream.write) {
    Logger.stream = Object.assign(Logger.stream, {
        write: (message) => Logger.info(message),
    });
}

module.exports.Logger = Logger;
