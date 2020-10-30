const logger = require("../../config/logger");
const Results = require("../../config/results");
const pool = require("../../database");
const crypto = require("crypto")
const jwt = require("jsonwebtoken");
const axios = require('axios');



let controller = {}


controller.getTest = async (req, res, next) => {
  try {
    // let [data] = await pool.query(`SELECT MIN(voter.id) AS id, username, REPLACE(phone,"-","") AS phone , MIN(code) AS code, COUNT(phone) as count FROM voter, election WHERE voter.election_id = election.id AND start_dt = '2020-10-26 14:00:00' GROUP BY voter.phone, voter.username ORDER BY voter.username`, [])
    let [data] = await pool.query(`SELECT MIN(voter.id) AS id, username, REPLACE(phone,"-","") AS phone , MIN(code) AS code, COUNT(phone) as count  FROM voter, election WHERE voter.election_id = election.id GROUP BY voter.phone, voter.username ORDER BY voter.username`)
    let test = data.map(data => {
      let id_type = "MID"
      let id = "id"
      let auth_key = "32bit 인증키"
      let msg_type = "KAT"
      let callback_key = "1489ASNKNASDI4AISDNALSDN"
      let send_id_receive_number = `${data.id}|${data.phone}`
      let template_code = "TML_001"
      let resend = "SMS"
      let content = `[카톡][VOTEON] ${data.username}님  ${data.count}건의 선거가 시작되었습니다. http://211.236.48.215:3000/voter/${data.code} 로 접속하여 투표하세요.`
      let smg_msg = `[문자][VOTEON] ${data.username}님  ${data.count}건의 선거가 시작되었습니다. http://211.236.48.215:3000/voter/${data.code} 로 접속하여 투표하세요.`
      return axios.post('http://127.0.0.1:3000/api/users', { id_type, id, auth_key, msg_type, callback_key, send_id_receive_number, template_code, resend, smg_msg, content })
    })

    // let test = await Promise.all(axios.all(promises).then((data) => { return data.data }))
    let promises = await Promise.all(test).then((response) => {
      return response.map(data => {
        return data.data
      })
    })

    return res.json(promises)
  }
  catch (e) {
    return res.json(e)
  }
}

controller.getTest2 = async (req, res, next) => {
  const { election } = req.query
  try {

    // let [data] = await pool.query(`SELECT MIN(voter.id) AS id, username, REPLACE(phone,"-","") AS phone , MIN(code) AS code, COUNT(phone) as count FROM voter, election WHERE voter.election_id = election.id AND start_dt = '2020-10-26 14:00:00' GROUP BY voter.phone, voter.username ORDER BY voter.username`, [])
    let [data] = await pool.query(` 
    SELECT id, username FROM voter WHERE voter.election_id = ${election} ORDER BY id   
    `)
    let test = data.map(data => {
      return axios.post('http://127.0.0.1:3000/api/users/abtest', { id: data.id, election })
    })

    let promises = await Promise.all(test).then((response) => {
      return response.map(data => {
        return data.data
      })
    })

    return res.json(promises)
  }
  catch (e) {
    return res.json(e)
  }
}
controller.getTest3 = async (req, res, next) => {
  const { election } = req.query
  try {

    // let [data] = await pool.query(`SELECT MIN(voter.id) AS id, username, REPLACE(phone,"-","") AS phone , MIN(code) AS code, COUNT(phone) as count FROM voter, election WHERE voter.election_id = election.id AND start_dt = '2020-10-26 14:00:00' GROUP BY voter.phone, voter.username ORDER BY voter.username`, [])
    let [data] = await pool.query(` 
    SELECT id, username FROM voter WHERE voter.election_id = ${election} ORDER BY id   
    `)
    let test = data.map(data => {
      return axios.get(`http://211.236.48.213:3000/api/users/abtest1?election=${election}`)
    })

    let promises = await Promise.all(test).then((response) => {
      return response.map(data => {
        return data.data
      })
    })

    return res.json(promises)
  }
  catch (e) {
    return res.json(e)
  }
}

controller.isLoginCheck = (req, res, next) => {
  const token = req.headers['x-access-token'];
  const files = req.files

  jwt.verify(token, 'locsadmin_ak', (err, decoded) => {
    if (err) {
      logger.error(err)
      return res.json(Results.onFailure("잘못된 접근입니다"))
    }
    else {
      req.files = files
      req.decoded = decoded;
      next();
    }
  })
}
controller.istokenCheck = (req, res, next) => {
  const token = req.headers['x-refresh-token'];

  jwt.verify(token, 'locsadmin_rk', (err, decoded) => {
    if (err) {
      logger.error(err)
      return res.json(Results.onFailure("잘못된 접근입니다"))
    }
    else {
      req.decoded = decoded;

      next();
    }
  })
}

controller.getAdminLogin = async (req, res, next) => {
  const { id, password } = req.body;

  try {
    const [[user]] = await pool.query('select *,UNIX_TIMESTAMP(enddate) as end from admin where username = ? and password = ?', [id, password])

    if (user == undefined) {
      return res.json(Results.onFailure("아이디나 패스워드가 틀렸습니다"))
      // return res.status(400).json(Results.onFailure("아이디나 패스워드가 틀렸습니다."))
    }

    const date = new Date()

    if (user.enddate < date) {
      return res.json(Results.onFailure("기간이 만료되었습니다"))
    }
    const payload = {
      id: user.id,
      username: user.username,
      enddate: user.enddate
    }
    await pool.query('update admin set last_login = now() where id = ?', [user.id])
    const access_token = jwt.sign(payload, "locsadmin_ak", { expiresIn: '1h' })
    const refresh_token = jwt.sign(payload, "locsadmin_rk", { expiresIn: Math.floor(user.end - (date.getTime() / 1000)) })
    const result = {
      username: user.username,
      option: user.noption,
      ak: access_token,
      rk: refresh_token
    }

    return res.json(Results.onSuccess(result))


  } catch (e) {
    logger.error(e)
    return res.json(Results.onFailure("에러"))
  }
}
controller.putAdminOption = async (req, res, next) => {
  const { id } = req.decoded
  // const { option } = req.body;
  try {
    const [data] = await pool.query('update admin set noption = 1 where id = ?', [id])

    return res.json(Results.onSuccess({ id: data.insertId }))
  } catch (e) {
    logger.error(e)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}

controller.TokenReissue = async (req, res, next) => {
  try {
    const { id } = req.decoded;
    const [[user]] = await pool.query('select *, UNIX_TIMESTAMP(enddate) as end from admin where id = ?', [id])

    if (user == undefined) {
      return res.json(Results.onFailure("아이디나 패스워드가 틀렸습니다"))
      // return res.status(400).json(Results.onFailure("아이디나 패스워드가 틀렸습니다."))
    }

    const date = new Date()

    if (user.enddate < date) {
      return res.json(Results.onFailure("기간이 만료되었습니다"))
    }
    const payload = {
      id: user.id,
      username: user.username,
      enddate: user.enddate
    }
    await pool.query('update admin set last_login = now() where id = ?', [user.id])
    const access_token = jwt.sign(payload, "locsadmin_ak", { expiresIn: '1h' })
    const refresh_token = jwt.sign(payload, "locsadmin_rk", { expiresIn: Math.floor(user.end - (date.getTime() / 1000)) })
    const result = {
      username: user.username,
      option: user.noption,
      ak: access_token,
      rk: refresh_token
    }
    return res.json(Results.onSuccess(result))
  }

  catch (e) {
    logger.error(e)
    return res.json(Results.onFailure("재발행 토큰 에러"))
  }
}

module.exports = controller;