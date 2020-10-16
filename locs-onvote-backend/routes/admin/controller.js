const logger = require("../../config/logger");
const Results = require("../../config/results");
const pool = require("../../database");
const crypto = require("crypto")
const jwt = require("jsonwebtoken");


let controller = {}

controller.getTest = async (req, res, next) => {
  const data = await pool.query('select * from admin limit 1')
  console.log(data[0])
  return res.json(data[0])
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
    console.log(id, password)
    const data = await pool.query('select * from admin where username = ? and password = ?', [id, password])
    console.log(data[0].length)
    if (data[0].length === 0) {
      return res.json(Results.onFailure("아이디나 패스워드가 틀렸습니다."))
    }
    const user = data[0][0]
    console.log(user.option)
    const date = new Date()
    console.log(date)
    if (user.enddate < date) {
      return res.json(Results.onFailure("기간이 만료되었습니다"))
    }
    const payload = {
      id: user.id,
      username: user.username,
      enddate: user.enddate
    }
    await pool.query('update admin set last_login = now() where id = ?', [user.id])
    const access_token = jwt.sign(payload, "locsadmin_ak", { expiresIn: '15d' })
    const refresh_token = jwt.sign(payload, "locsadmin_rk", { expiresIn: '365d' })
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
    console.log(data)
    return res.json(Results.onSuccess({ id: data.insertId }))
  } catch (e) {
    logger.error(e)
    return res.json(Results.onFailure("ERROR"))
  }
}

module.exports = controller;