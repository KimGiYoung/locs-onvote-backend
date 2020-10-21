var cron = require('node-cron');
const pool = require("../database");
const logger = require('./logger');

cron.schedule('*/1 * * * *', async () => {
    // 이부분에 스케쥴 될 Data 값이 들어감
    try {
        let [election] = await pool.query('SELECT * FROM election')
        await election.map(async data => {
            console.log(new Date(data.start_dt).toLocaleString());
            if (data.flag == 0) {
                let start_dt = new Date(data.start_dt).getTime()
                let now = new Date().getTime()
                if (now >= start_dt) {
                    await pool.query('UPDATE election SET flag = 1 WHERE id=?', [data.id])
                    logger.info(data.name + "선거 시작 되었습니다.")

                }
            }

        }
        )

        console.log("살아있다")
    }
    catch (e) {
        console.log(e)
        console.log("에러")
    }

});
cron.schedule('*/5 * * * *', async () => {
    // 이부분에 스케쥴 될 Data 값이 들어감
    try {
        let [election] = await pool.query('SELECT * FROM election')
        election.map(data => {
            console.log(new Date(data.start_dt).toLocaleString());
        }
        )


    }
    catch (e) {
        console.log(e)
        console.log("에러")
    }
    console.log("5분마다 살아있다")
});


module.exports = cron;