const { createClient } = require('@clickhouse/client');
const { isUndefinedOrNull } = require('../../utils/validators');
require("dotenv").config();

const clickhouseEnable = process.env.CLICKHOUSE_ENABLE;
const clickhouseHost = process.env.CLICKHOUSE_HOST;
const clickhouseUser = process.env.CLICKHOUSE_USER;
const clickhousePassword = process.env.CLICKHOUSE_PASSWORD;
const clickhouseDB = process.env.CLICKHOUSE_DB;

let clickhouse = null;

async function connect() {

    if (isUndefinedOrNull(clickhouseEnable) || !clickhouseEnable) return;

    clickhouse = createClient({
        url: clickhouseHost,
        username: clickhouseUser,
        password: clickhousePassword,
        database: clickhouseDB
    });


    try {
        const resultSet = await clickhouse.query({
            query: 'SELECT now()',
            format: 'JSON',
        });

        const rows = await resultSet.json();
        console.log('ClickHouse Time:', rows);
    } catch (err) {
        console.error('Error querying ClickHouse:', err);
    }

}

const getClickhouseDB = () => {
    return clickhouse;
}

module.exports = {
    connect,
    getClickhouseDB
}
  