const pool = require("../../database");
const logger = require("../../config/logger");
const Results = require("../../config/results");
const { nanoid } = require("nanoid");
let controller = {}

controller.getTest = async (req, res, next) => {
  const data = await pool.query('select * from user limit 1')

  return res.json(data[0])
}


controller.getballotList = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params
  try {
    const [data] = await pool.query('SELECT ballot.id, ballot.flag, ballot.ballotdate, voter.username, voter.phone, voter.birthday FROM ballot, voter WHERE voter.id = ballot.voter_id AND ballot.election_id =? ', [election])

    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
  }
}

controller.setballotList = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params
  const { voter_id } = req.body
  try {

    const [voter] = await pool.query('SELECT phone FROM voter WHERE id = ?', [voter_id])

    if (voter.length == 0) {
      return res.json(Results.onFailure("후보자 정보가 없습니다"))
    }
    if (election == 0) {

      const phone = voter[0].phone
      const [election] = await pool.query('SELECT voter.id as id, election.id as election_id FROM voter, election WHERE voter.phone = ? AND voter.election_id = election.id AND election.flag = 0 ', [phone])

      let electionlist = []
      let voter_id = []

      for (let data of election) {
        electionlist.push({ election_id: data.election_id, voter_id: data.id, flag: 0, code: nanoid(10) })
        voter_id.push(data.id)
      }

      // const [data] = await pool.query('INSERT INTO  ballot(election_id, voter_id, flag, code) VALUES (?)', [electionlist])

      return res.json(Results.onSuccess({ electionlist }))
    }
    else {
      const [data] = await pool.query('INSERT INTO  ballot(election_id, voter_id, flag, code) VALUES (?, ?, ?, ?)', [election, voter_id, 0, nanoid(10)])
      return res.json(Results.onSuccess({ id: data.insertId }))
    }
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
  }
}



controller.deleteballotList = async (req, res, next) => {
  const { id } = req.decoded
  const { election, ballot } = req.params
  try {
    const [data] = await pool.query('delete FROM ballot WHERE election_id = ? AND id = ?', [election, ballot])

    return res.json(Results.onSuccess({ id: ballot }))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
  }
}

controller.getDetailballot = async (req, res, next) => {
  const { id } = req.decoded
  const { election, ballot } = req.params
  try {
    let [[data]] = await pool.query('SELECT ballot.*, election.*, voter.username FROM ballot, election,voter WHERE ballot.election_id = ? AND ballot.election_id = election.id AND ballot.id = ? AND election.id= voter.election_id  AND ballot.voter_id = voter.id ', [election, ballot])
    if (data == undefined) return res.json(Results.onFailure("잘못된 권한입니다."))
    //const [[voter]] = await pool.query('SELECT username FROM voter WHERE id = ?', [data.voter_id])
    //data.username = voter.username

    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
  }
}


controller.getElectionList = async (req, res, next) => {
  const { id } = req.decoded

  try {

    const [data] = await pool.query('SELECT  election.id, election.name, election.start_dt, election.end_dt, election.flag, COUNT(*) AS `all`, COUNT(IF(voter.flag=1, voter.flag, NULL)) AS `count`, COUNT(IF(voter.flag=1, voter.flag, NULL))/COUNT(*)*100 AS rate FROM election JOIN voter WHERE admin_id = ? AND election.id = voter.election_id AND election.flag = 1 GROUP BY election.name, election.flag, election.start_dt, election.end_dt, election.id ORDER BY election.start_dt desc', [id])
    return res.json(Results.onSuccess(data))

  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
  }
}

controller.getVoteList = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params
  const { pageNum, limit } = req.query
  let npageNum = Number(pageNum) || 1  // NOTE: 쿼리스트링으로 받을 페이지 번호 값, 기본값은 1
  const contentSize = 10 // NOTE: 페이지에서 보여줄 컨텐츠 수.
  let nlimit = Number(limit) || 10

  const skipSize = (npageNum - 1) * contentSize // NOTE: 다음 페이지 갈 때 건너뛸 
  console.log(npageNum)

  try {
    const [[vote]] = await pool.query('SELECT count(*) as count FROM voter WHERE election_id = ?', [election])
    const totalCount = Number(vote.count)

    const [data] = await pool.query('SELECT * FROM voter WHERE election_id = ? ORDER BY id LIMIT ?, ?', [election, skipSize, nlimit])

    const result = {
      pageNum,
      totalCount,
      contents: data,
    }
    return res.json(Results.onSuccess(result))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
  }
}


controller.putElectionInvalid = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.body
  const electionlist = election.split(',')
  let connection = await pool.getConnection(async conn => conn)
  try {
    connection.beginTransaction()

    let bElection = electionlist.map(async data => {
      const [[check]] = await connection.query('SELECT flag FROM election WHERE id = ?', [data])

      if (check == undefined) return -1
      if (check.flag == 2 || check.flag == 3) {
        console.log("선거 무효를 할수 없습니다")
        return 1
      }
      await connection.query('UPDATE election SET flag = 3 WHERE id = ?', [data])
      return 0
    })
    let bElection_check = await Promise.all(bElection)
    if (bElection_check.indexOf(1) != -1) {
      connection.rollback()
      return res.json(Results.onFailure("선거 무효를 할수 없습니다"))

    }

    connection.commit()
    connection.release()
    return res.json(Results.onSuccess({ id: electionlist }))
  } catch (error) {
    connection.rollback()
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
  }
}


controller.putElectionAddDate = async (req, res, next) => {
  const { id } = req.decoded
  const { election, end } = req.body
  const electionlist = election.split(',')
  let connection = await pool.getConnection(async conn => conn)
  const tEnd = new Date(end).toLocaleString('ko-KR', { hour12: false })

  try {
    connection.beginTransaction()

    let bElection = electionlist.map(async data => {
      const [[check]] = await connection.query('SELECT flag FROM election WHERE id = ?', [data])
      if (check.flag == 2 || check.flag == 3) {
        console.log("선거 연장수 없습니다")
        return 1
      }
      await connection.query('UPDATE election SET end_dt = ? WHERE id = ?', [tEnd, data])
      return 0
    })

    let bElection_check = await Promise.all(bElection)

    if (bElection_check.indexOf(1) != -1) {
      connection.rollback()
      return res.json(Results.onFailure("선거 연장수 없습니다"))

    }

    connection.commit()
    connection.release()
    return res.json(Results.onSuccess({ id: electionlist }))
  } catch (error) {
    connection.rollback()
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
  }
}

module.exports = controller;