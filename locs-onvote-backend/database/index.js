const mysql = require('mysql2/promise');
const dbconfig = require('../config/dbconfig');
const logger = require('../config/logger');

const pool = mysql.createPool(dbconfig)

logger.info('Connection pool created.');

pool.on('acquire', (connection) => {
    logger.info(`Connection ${connection.threadId} acquired`);
});

pool.on('enqueue', () => {
    logger.info('Waiting for available connection slot');
});

pool.on('release', (connection) => {
    logger.info(`Connection ${connection.threadId} released`);
});


module.exports = pool;