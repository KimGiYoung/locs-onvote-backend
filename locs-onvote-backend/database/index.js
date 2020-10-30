const mysql = require('mysql2/promise');
const dbconfig = require('../config/dbconfig');
const logger = require('../config/logger');

const pool = mysql.createPool(dbconfig)

logger.debug('Connection pool created.');

pool.on('acquire', (connection) => {
    //logger.debug(`Connection ${connection.threadId} acquired`);
});

pool.on('enqueue', () => {
    //logger.debug('Waiting for available connection slot');
});

pool.on('release', (connection) => {
    //logger.debug(`Connection ${connection.threadId} released`);
});


module.exports = pool;