var cron = require('node-cron');
const pool = require("../database");

cron.schedule('*/1 * * * *', async () => {
    // 이부분에 스케쥴 될 Data 값이 들어감
    try {
        let [election] = await pool.query('SELECT * FROM election')
        await election.map(async data => {
            if (data.flag == 0) {
                let start_dt = new Date(data.start_dt).getTime()
                let now = new Date().getTime()
                if (now >= start_dt) {
                    await pool.query('UPDATE election SET flag = 1 WHERE id=?', [data.id])
                    console.log(data.name + "선거 시작 되었습니다.")

                }
            }

        }
        )


    }
    catch (e) {
        console.log(e)
        console.log("에러")
    }
    console.log("살아있다")
});
cron.schedule('*/5 * * * *', async () => {
    // 이부분에 스케쥴 될 Data 값이 들어감
    try {
        let [election] = await pool.query('SELECT * FROM election')
        election.map(data => {
            console.log(data.start_dt);
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