const cron = require('node-cron');
const pool = require("../database");
const logger = require('./logger');
const axios = require('axios');

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

                            const [[voter_date]] = await connection.query('SELECT * FROM voter_date WHERE voter_date = ?', [data.start_dt])
                            if (voter_date == undefined) {
                                await connection.query(`INSERT INTO voter_date(voter_date) VALUES (?)`, [data.start_dt])
                                let [voter] = await pool.query(`SELECT MIN(voter.id) AS id, username, REPLACE(phone,"-","") AS phone , MIN(code) AS code, COUNT(phone) as count  FROM voter, election WHERE voter.election_id = election.id AND UNIX_TIMESTAMP(election.start_dt) = ${data.start_dt} GROUP BY voter.phone, voter.username ORDER BY voter.username`)
                                let test = voter.map(voters => {
                                    let id_type = "MID"
                                    let id = "id"
                                    let auth_key = "32bit 인증키"
                                    let msg_type = "KAT"
                                    let callback_key = "1489ASNKNASDI4AISDNALSDN"
                                    let send_id_receive_number = `${voters.id}|${voters.phone}`
                                    let template_code = "TML_001"
                                    let resend = "SMS"
                                    let content = `[카톡][VOTEON] ${voters.username}님  ${voters.count}건의 선거가 시작되었습니다. https://voteon.kr/user/${voters.code} 로 접속하여 투표하세요.`
                                    let smg_msg = `[문자][VOTEON] ${voters.username}님  ${voters.count}건의 선거가 시작되었습니다. https://voteon.kr/user/${voters.code} 로 접속하여 투표하세요.`
                                    return axios.post('http://127.0.0.1:3000/api/users', { id_type, id, auth_key, msg_type, callback_key, send_id_receive_number, template_code, resend, smg_msg, content })
                                })

                                let promises = await Promise.all(test).then((response) => {
                                    return response.map(data => {
                                        return data.data
                                    })
                                })

                            }

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

                        const [[voter_date]] = await connection.query('SELECT * FROM ballot_date WHERE ballot_date = ?', [data.end_dt])
                        if (voter_date == undefined) {
                            await connection.query(`INSERT INTO ballot_date(ballot_date) VALUES (?)`, [data.end_dt])
                            let [voter] = await pool.query(`SELECT voter.username, voter.phone,  MIN(ballot.code) AS  code FROM  ballot, voter, election WHERE ballot.voter_id = voter.id AND ballot.election_id =election.id AND UNIX_TIMESTAMP(election.end_dt) = ${data.end_dt} GROUP BY voter.username, voter.phone ORDER BY voter.username`)
                            let test = voter.map(voters => {
                                let id_type = "MID"
                                let id = "id"
                                let auth_key = "32bit 인증키"
                                let msg_type = "KAT"
                                let callback_key = "1489ASNKNASDI4AISDNALSDN"
                                let send_id_receive_number = `${voters.id}|${voters.phone}`
                                let template_code = "TML_001"
                                let resend = "SMS"
                                let content = `[카톡][VOTEON] ${voters.username}님  선거가 완료 되었습니다. 개표확인이 필요합니다. https://voteon.kr/confirm/${voters.code} 로 접속하여 확인하세요.`
                                let smg_msg = `[문자][VOTEON] ${voters.username}님  선거가 완료 되었습니다. 개표확인이 필요합니다. https://voteon.kr/confirm/${voters.code} 로 접속하여 확인하세요.`
                                return axios.post('http://127.0.0.1:3000/api/users', { id_type, id, auth_key, msg_type, callback_key, send_id_receive_number, template_code, resend, smg_msg, content })
                            })

                            let promises = await Promise.all(test).then((response) => {
                                return response.map(data => {
                                    return data.data
                                })
                            })

                        }

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
}
module.exports = cron;