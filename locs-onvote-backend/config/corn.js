var cron = require('node-cron');
const pool = require("../database");
const logger = require('./logger');

if (process.env.NODE_APP_INSTANCE === "0") {
    cron.schedule('*/1 * * * *', async () => {
        // 선거 시작 제어
        let connection = await pool.getConnection(async conn => conn)
        try {

            let [election] = await connection.query('SELECT id, name, admin_id, flag, UNIX_TIMESTAMP(start_dt) as start_dt FROM  election')
            await election.map(async data => {
                if (data.flag == 0) {
                    let start_dt = data.start_dt
                    let now = Math.floor(new Date().getTime() / 1000)

                    if (now >= start_dt) {
                        const [[candidate]] = await connection.query('SELECT COUNT(*) as count FROM candidate WHERE election_id=?', [data.id])
                        if (candidate.count == 0) {
                            // 투표 현황 로그에 반영해야됨
                            await connection.query('INSERT INTO vote_logs(ip, admin_id, text) VALUES (?,?,?)', [logger.getIP(), data.admin_id, `등록된 후보자가 존재하지 않아 [${data.name}] 선거를 시작 할수 없습니다`])
                            logger.info(data.name + "선거를 시작 할수 없습니다")

                        }
                        else {
                            await connection.query('UPDATE election SET flag = 1 WHERE id=?', [data.id])
                            await connection.query('INSERT INTO vote_logs(ip, admin_id, text) VALUES (?,?,?)', [logger.getIP(), data.admin_id, `[${data.name}] 선거가 시작 되었습니다`])
                            logger.info(data.name + "선거 시작 되었습니다.")
                        }
                    }
                }
            }
            )

            await connection.commit()
            await connection.release()
            console.log("시작제어")
        }
        catch (e) {
            await connection.rollback()
            await aconnection.release()
            logger.error(e)
            console.log("에러")
        }
    });

    cron.schedule('*/1 * * * *', async () => {
        // 선거 종료 제어
        let connection = await pool.getConnection(async conn => conn)
        try {
            let [election] = await connection.query('SELECT id, name, flag,  admin_id,  UNIX_TIMESTAMP(end_dt) as end_dt FROM election')
            await election.map(async data => {
                if (data.flag == 1) {
                    let end_dt = data.end_dt
                    let now = Math.floor(new Date().getTime() / 1000)
                    if (now >= end_dt) {
                        await connection.query('UPDATE election SET flag = 2 WHERE id=?', [data.id])
                        await connection.query('INSERT INTO vote_logs(ip, admin_id, text) VALUES (?,?,?)', [logger.getIP(), data.admin_id, `[${data.name}] 선거가 종료 되었습니다`])

                        logger.info("[" + data.name + "]가 선거 종료 되었습니다.")
                    }
                }
            }
            )
            await connection.commit()
            await connection.release()
            console.log("종료 제어")
        }
        catch (e) {
            await connection.rollback()
            await connection.release()
            logger.error(e)
            console.log("에러")
        }
    });
    // cron.schedule('*/5 * * * *', async () => {
    //     // 이부분에 스케쥴 될 Data 값이 들어감
    //     try {
    //         let [election] = await pool.query('SELECT * FROM election')
    //         election.map(data => {
    //             console.log(new Date(data.start_dt).toLocaleString());
    //         }
    //         )


    //     }
    //     catch (e) {
    //         console.log(e)
    //         console.log("에러")
    //     }
    //     console.log("5분마다 살아있다")
    // });

}
module.exports = cron;