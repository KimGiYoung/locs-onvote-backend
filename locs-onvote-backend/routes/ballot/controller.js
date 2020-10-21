const logger = require("../../config/logger");
const Results = require("../../config/results");
const pool = require("../../database");
const crypto = require("crypto")
const jwt = require("jsonwebtoken");
let controller = {}

controller.getTest = async (req, res, next) => {
  const data = await pool.query('select * from voter limit 1')

  return res.json(data[0])
}

controller.isLoginCheck = (req, res, next) => {
  const token = req.headers['x-access-token'];
  const files = req.files

  jwt.verify(token, 'locsballot_ak', (err, decoded) => {
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
  jwt.verify(token, 'locsballot_rk', (err, decoded) => {
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



controller.getBallotLogin = async (req, res, next) => {
  const { code, phone } = req.body

  const strquery = "%" + phone

  try {

    const [[user]] = await pool.query('SELECT voter.username, voter.birthday, voter.phone FROM ballot, voter WHERE ballot.code = ? AND ballot.voter_id = voter.id AND voter.phone LIKE (?)', [code, strquery])

    if (user == undefined) return res.json(Results.onFailure("잘못된 권한 코드 입니다"))
    const payload = {
      username: user.username,
      birthday: user.birthday,
      phone: user.phone
    }

    const access_token = jwt.sign(payload, "locsballot_ak", { expiresIn: '15d' })
    const refresh_token = jwt.sign(payload, "locsballot_rk", { expiresIn: '365d' })

    const result = {
      username: user.username,
      phone: user.phone,
      ak: access_token,
      rk: refresh_token
    }
    return res.json(Results.onSuccess(result))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
  }
}

controller.getBallotlist = async (req, res, next) => {
  const { phone } = req.decoded

  try {

    const [ballot] = await pool.query('SELECT ballot.id, ballot.ballotdate, ballot.flag, election.name FROM ballot, voter, election WHERE ballot.voter_id = voter.id AND  voter.election_id = election.id  AND voter.phone = ?', [phone])

    return res.json(Results.onSuccess(ballot))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
  }
}

controller.setBallotlist = async (req, res, next) => {
  const { phone } = req.decoded
  const { ballot } = req.body

  try {

    const [[check]] = await pool.query('SELECT election.flag FROM ballot, election WHERE ballot.election_id = election.id AND ballot.id = ?', [ballot])
    if (check == undefined) return res.json(Results.onFailure("권한 번호가 잘못 되었습니다"))


    if (check.flag != 2) return res.json(Results.onFailure("완료되지 않은 선거 입니다"))

    const [data] = await pool.query('UPDATE ballot SET ballotdate = now(), flag = 1 WHERE id = ?', [ballot])
    return res.json(Results.onSuccess({ id: ballot }))

  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
  }
}

module.exports = controller;