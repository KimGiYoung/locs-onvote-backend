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

    const [[user]] = await pool.query('SELECT voter.username, voter.birthday, voter.phone FROM ballot, voter WHERE ballot.code = ? AND ballot.voter_id = voter.id AND voter.phone LIKE (?) LIMIT 1', [code, strquery])

    if (user == undefined) return res.json(Results.onFailure("인증이 실패하였습니다"))

    const [check] = await pool.query('SELECT voter.election_id FROM ballot, voter WHERE ballot.code = ? AND ballot.voter_id = voter.id AND voter.phone LIKE (?) LIMIT 1', [code, strquery])
    if (check.length == 0) return res.json(Results.onFailure("개표 확인할 목록이 없습니다."))
    const election_list = check.map(data => {
      return data.election_id
    })

    const [check1] = await pool.query('SELECT end_dt from election where id in (?) and voteflag=0', [election_list])
    if (check1.length == 0) return res.json(Results.onFailure("개표 확인할 목록이 없습니다."))


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
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}

controller.getBallotlist = async (req, res, next) => {
  const { phone } = req.decoded

  try {

    const [ballot] = await pool.query('SELECT ballot.id, ballot.ballotdate, ballot.flag, election.name FROM ballot, voter, election WHERE ballot.voter_id = voter.id AND  voter.election_id = election.id AND election.flag = 2 AND voter.phone = ? ORDER BY ballot.id', [phone])

    return res.json(Results.onSuccess(ballot))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}

controller.setBallotlist = async (req, res, next) => {
  const { phone } = req.decoded
  const { ballot } = req.body
  const ballotlist = ballot.split(',')
  try {

    const [check] = await pool.query('SELECT ballot.id, ballot.ballotdate, election.flag AS flag,  ballot.flag AS ballotflag, election.name FROM ballot, voter, election WHERE ballot.voter_id = voter.id AND  voter.election_id = election.id  AND voter.phone = ? AND ballot.id IN(?) ', [phone, ballotlist])
    if (check.length == 0) return res.json(Results.onFailure("권한 번호가 잘못 되었습니다"))

    const nlist = check.map(data => {
      if (data.flag != 2) return 1
      if (data.ballotflag == 1) return 2
      return 0
    })

    if (nlist.indexOf(1) != -1) {
      return res.json(Results.onFailure("완료되지 않은 선거 입니다"))
    }
    else if (nlist.indexOf(2) != -1) {
      return res.json(Results.onFailure("이미 승인이 완료된 선거가 있습니다"))
    }

    await pool.query('UPDATE ballot SET ballotdate = now(), flag = 1 WHERE id in(?)', [ballotlist])
    return res.json(Results.onSuccess({ id: ballot }))

  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}

module.exports = controller;