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

  jwt.verify(token, 'locsuser_ak', (err, decoded) => {
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
  jwt.verify(token, 'locsuser_rk', (err, decoded) => {
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

controller.getUserLogin = async (req, res, next) => {
  const { code, phone } = req.body

  const strquery = "%" + phone
  try {
    const [[user]] = await pool.query('SELECT * FROM voter WHERE code = ? AND phone LIKE (?) limit 1', [code, strquery])

    if (user == undefined) return res.json(Results.onFailure("인증이 실패하였습니다"))
    const payload = {
      id: user.id,
      username: user.username,
      birthday: user.birthday,
      phone: user.phone
    }

    const access_token = jwt.sign(payload, "locsuser_ak", { expiresIn: '15d' })
    const refresh_token = jwt.sign(payload, "locsuser_rk", { expiresIn: '365d' })
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

controller.getElectionList = async (req, res, next) => {
  const { phone } = req.decoded
  try {
    const [data] = await pool.query('SELECT election.id, election.name, election.start_dt, election.end_dt, voter.flag FROM election, voter WHERE election.id = voter.election_id AND election.flag in(1) AND voter.phone = ? ORDER BY election.id', [phone])
    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
  }
}

controller.getCandidateList = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params


  // 선거가 진행중일때만 조회할수잇도록 한다 예외처리 해야됨

  try {

    const [candidate] = await pool.query('SELECT candidate.*, voter.username FROM candidate, voter WHERE voter.id = candidate.voter_id AND voter.election_id = ?', [election])

    return res.json(Results.onSuccess(candidate))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
  }
}

controller.setCandidateList = async (req, res, next) => {
  const { phone } = req.decoded
  const { election } = req.params
  const { candidate } = req.body

  console.log(candidate)
  // 선거가 진행중일때만 조회할수잇도록 한다 예외처리 해야됨    
  let connection = await pool.getConnection(async conn => conn)
  try {
    // 유권자 검사
    connection.beginTransaction()
    const [[user]] = await connection.query('SELECT * FROM voter WHERE phone = ? AND election_id = ?', [phone, election])

    if (user == undefined) return res.json(Results.onFailure("진행할수 없는 선거 입니다."))
    // 후보자 검사 

    if (candidate == -1) {
      await connection.query('UPDATE voter SET flag = 1, votedate = now() WHERE id = ?', [user.id])
      await connection.query('INSERT INTO  vote_result values(?, ?)', [election, null])

    }
    else {
      const [[data]] = await connection.query('SELECT * FROM candidate WHERE id = ?', [candidate])

      if (data == undefined) return res.json(Results.onFailure("후보자가 없습니다."));

      await connection.query('UPDATE voter SET flag = 1, votedate = now() WHERE id = ?', [user.id])
      await connection.query('INSERT INTO  vote_result values(?, ?)', [election, candidate])


    }
    await connection.commit()
    connection.release()

    return res.json(Results.onSuccess({ id: candidate }))
  } catch (error) {
    await connection.rollback()
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
  }
}



controller.setCandidateAllTest = async (req, res, next) => {

  const { election } = req.body

  // 선거가 진행중일때만 조회할수잇도록 한다 예외처리 해야됨    
  let connection = await pool.getConnection(async conn => conn)
  try {
    // 유권자 검사
    connection.beginTransaction()
    const [user] = await connection.query('SELECT * FROM voter WHERE flag = 0 AND  election_id = ?', [election])
    const [candidate] = await connection.query('SELECT id FROM candidate WHERE  election_id = ?', [election])

    const lcandidate = candidate.map(data => {
      return data.id
    })
    lcandidate.push(null)

    if (user.length == 0) return res.json(Results.onFailure("변경할 데이터가 없습니다"))
    let votereuslt = []
    user.map(async data => {
      const num = lcandidate[Math.floor(Math.random() * lcandidate.length)]
      votereuslt.push([data.election_id, num])
    })

    await connection.query('UPDATE voter SET flag =1, votedate = now() WHERE election_id = ? AND flag = 0', [election])
    await connection.query('INSERT INTO vote_result VALUES ?', [votereuslt])

    await connection.commit()
    connection.release()

    return res.json(Results.onSuccess({ id: candidate }))
  } catch (error) {
    await connection.rollback()
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
  }
}


controller.setCandidateTest = async (req, res, next) => {

  const { election } = req.body

  // 선거가 진행중일때만 조회할수잇도록 한다 예외처리 해야됨    
  let connection = await pool.getConnection(async conn => conn)
  try {
    // 유권자 검사
    connection.beginTransaction()
    const [[user]] = await connection.query('SELECT * FROM voter WHERE flag = 0 AND  election_id = ? limit 1', [election])
    const [candidate] = await connection.query('SELECT id FROM candidate WHERE  election_id = ?', [election])

    const lcandidate = candidate.map(data => {
      return data.id
    })
    lcandidate.push(null)

    if (user == undefined) return res.json(Results.onFailure("변경할 데이터가 없습니다"))

    await connection.query('UPDATE voter SET flag =1, votedate = now() WHERE election_id = ? AND flag = 0 AND id = ?', [election, user.id])
    await connection.query('INSERT INTO vote_result VALUES (?, ?)', [election, lcandidate[Math.floor(Math.random() * lcandidate.length)]])

    await connection.commit()
    connection.release()

    return res.json(Results.onSuccess({ id: candidate }))
  } catch (error) {
    await connection.rollback()
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
  }
}
module.exports = controller;