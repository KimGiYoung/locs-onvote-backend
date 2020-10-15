var cron = require('node-cron');
const pool = require("../database");

cron.schedule('*/1 * * * *', () => {
    // 이부분에 스케쥴 될 Data 값이 들어감
    console.log("살아있다")
});
cron.schedule('*/5 * * * *', () => {
    // 이부분에 스케쥴 될 Data 값이 들어감
    console.log("5분마다 살아있다")
});


module.exports = cron;