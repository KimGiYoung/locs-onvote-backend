const pool = require("../../database");
const logger = require("../../config/logger");
const Results = require("../../config/results");
let controller = {}

controller.getTest = async (req, res, next) => {
  const data = await pool.query('select * from user limit 1')
  console.log(data[0])
  return res.json(data[0])
}


controller.getballotList = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params
  try {
    const [data] = await pool.query('SELECT ballot.id, ballot.flag, ballot.days, voter.username, voter.phone FROM ballot, voter WHERE voter.id = ballot.voter_id AND election_id =? ', [election])
    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }
}

controller.setballotList = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params
  const { voter_id } = req.body
  try {
    const [voter] = await pool.query('SELECT * FROM vote WHERE voter_id = ?', [voter_id])

    if (voter.length == 0) {
      return res.json(Results.onFailure("후보자 정보가 없습니다"))
    }

    const [data] = await pool.query('INSERT INTO  ballot(election_id, voter_id, flag) VALUES (?, ?, ?)', [election, voter_id, 0])
    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }
}

controller.deleteballotList = async (req, res, next) => {
  const { id } = req.decoded
  const { election, ballot } = req.params
  try {
    const [data] = await pool.query('delete FROM ballot WHERE election_id = ? AND id = ?', [election, ballot])

    return res.json(Results.onSuccess(data.affectedRows))
  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }
}


controller.getElectionList = async (req, res, next) => {
  const { id } = req.decoded
  const { start, end } = req.query
  try {
    if (start != null || end != null) {
      const [data] = await pool.query('SELECT  election.id, election.name, election.start_dt, election.end_dt, election.flag, COUNT(*) AS `all`, COUNT(IF(vote.flag=1, vote.flag, NULL)) AS `count`, COUNT(IF(vote.flag=1, vote.flag, NULL))/COUNT(*)*100 AS rate FROM election JOIN vote WHERE admin_id = ? AND election.id = vote.election_id AND start_dt BETWEEN ? AND ? GROUP BY election.name, election.flag, election.start_dt, election.end_dt, election.id ORDER BY election.start_dt desc', [id, start, end])
      return res.json(Results.onSuccess(data))
    }
    else {
      const [data] = await pool.query('SELECT  election.id, election.name, election.start_dt, election.end_dt, election.flag, COUNT(*) AS `all`, COUNT(IF(vote.flag=1, vote.flag, NULL)) AS `count`, COUNT(IF(vote.flag=1, vote.flag, NULL))/COUNT(*)*100 AS rate FROM election JOIN vote WHERE admin_id = ? AND election.id = vote.election_id GROUP BY election.name, election.flag, election.start_dt, election.end_dt, election.id ORDER BY election.start_dt desc', [id])
      return res.json(Results.onSuccess(data))
    }
  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }
}

controller.getVoteList = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params
  const { pageNum } = req.query
  let npageNum = Number(pageNum) || 1  // NOTE: 쿼리스트링으로 받을 페이지 번호 값, 기본값은 1
  const contentSize = 10 // NOTE: 페이지에서 보여줄 컨텐츠 수.
  const pnSize = 10  // NOTE: 페이지네이션 개수 설정.
  const skipSize = (npageNum - 1) * contentSize // NOTE: 다음 페이지 갈 때 건너뛸 
  console.log(npageNum)

  try {
    const [[vote]] = await pool.query('SELECT count(*) as count FROM vote WHERE election_id = ?', [election])
    const totleCount = Number(vote.count)
    const pnTotal = Math.ceil(totleCount / contentSize)
    const pnStart = ((Math.ceil(npageNum / pnSize) - 1) * pnSize) + 1 // NOTE: 현재
    let pnEnd = (pnStart + pnSize) - 1
    const [data] = await pool.query('SELECT voter.username, voter.days, voter.phone, vote.flag, vote.days FROM vote,voter WHERE election_id = ? AND voter.id  = vote.voter_id ORDER BY voter.id LIMIT ?, ?', [election, skipSize, contentSize])
    if (pnEnd > pnTotal) pnEnd = pnTotal; // NOTE: 페이지네이션의 끝 번호가 페이지네이션 전체 카운트보다 높을 경우.
    const result = {
      pageNum,
      pnStart,
      pnEnd,
      pnTotal,
      contents: data,
    }
    return res.json(Results.onSuccess(result))
  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }
}

module.exports = controller;