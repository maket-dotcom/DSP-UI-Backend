const chalk = require('chalk');
const { isUndefinedOrNullOrEmpty } = require('./validators');
require("dotenv").config();

const getColoredLabel = (level, message) => {
    if (isUndefinedOrNullOrEmpty(message)) return '';
    if (process.env.MODE !== 'development') return level;
    if (level === 'info') return chalk.greenBright(level);
    if (level === 'debug') return chalk.blue(level);
    if (level === 'error') return chalk.redBright(level);
    if (level === 'warn') return chalk.magentaBright(level);
    return chalk.cyanBright(level);
};

module.exports = {
    getColoredLabel,    
};
