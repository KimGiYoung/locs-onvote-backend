const appRoot = require('app-root-path');
const winston = require('winston');
const winstonDaily = require('winston-daily-rotate-file');
const process = require('process');

const { combine, timestamp, label, printf } = winston.format;

const myFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

const options = {
    file: {
        // 로그 파일 저장시... 작성
        // 로그 레벨 =>
        // error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5
        level: 'info',
        datePattern: 'YYYYMMDD', // 날짜 형식 (moment.js, 대문자)
        dirname: './logs', // default: '.'
        colorize: false,
        showLevel: true,
        filename: `OnVote_%DATE%.log`, // %DATE% => dataPattern 형식에 따른 날짜
        format: combine(
            label({ label: 'express_server' }),
            timestamp(
                {
                    format: 'YYYY-MM-DD HH:mm:ss',
                }
            ),
            myFormat
        )
        // maxSize: null, // 로그 파일 하나당 용량 제한 ( kb, mb, gb. => 'k', 'm', 'g' )
        // maxFiles: '30d' // 로그 파일 남길 갯수 또는 일, ex) 2일 => '2d'

    },
    console: {
        level: 'debug',
        handleExceptions: true,
        json: false,
        colorize: true,
        format: combine(
            label({ label: 'express_server' }),
            timestamp(
                {
                    format: 'YYYY-MM-DD HH:mm:ss',
                }
            ),
            myFormat
        )
    }
}

let logger = new winston.createLogger({
    transports: [
        new winston.transports.Console(options.console),
        new winstonDaily(options.file)
    ],
    exitOnError: false, // do not exit on handled exceptions
});


logger.stream = {
    write: function (message, encoding) {
        logger.info(message);
    },
};

module.exports = logger;