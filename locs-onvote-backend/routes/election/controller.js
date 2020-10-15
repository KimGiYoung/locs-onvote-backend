const logger = require("../../config/logger");
const Results = require("../../config/results");
const pool = require("../../database");
const xlsx = require("xlsx");
const { json } = require("body-parser");

let controller = {}

controller.getTest = async (req, res, next) => {
  var test = [['이름', '생년월일', '핸드폰', '성별'], ['홍길동', '1988-01-01', '010-1234-4567', '남'], ['이순신', '1989-05-12', '010-4567-1234', '남'], ['나홍순', '1999-03-03', '010-5678-1597', '여']];
  var [data] = await pool.query('SELECT username as "이름", days as "생년월일", phone as "핸드폰", gender as "성별" FROM voter')
  console.log(data)
  var ws_name = 'SheetJS';
  let book = xlsx.utils.book_new();
  // let ws = xlsx.utils.json_to_sheet(data);
  let ws = xlsx.utils.aoa_to_sheet(test);
  xlsx.utils.book_append_sheet(book, ws, ws_name);
  var buf = xlsx.write(book, { type: 'buffer', bookType: "xlsx" });


  res.setHeader('Content-Disposition', 'attachment; filename="example.xlsx');
  return res.send(buf)
}

controller.getElectionList = async (req, res, next) => {
  const { id } = req.decoded
  const { } = req.query
  try {
    const [data] = await pool.query('SELECT * FROM election WHERE admin_id = ?', [id])
    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }
}
controller.getElectionShortList = async (req, res, next) => {
  const { id } = req.decoded
  try {
    const [data] = await pool.query('SELECT id, comment FROM election WHERE admin_id = ?', [id])
    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }

}

controller.setElectionList = async (req, res, next) => {
  const { id } = req.decoded
  const { comment, start_dt, end_dt, start_preview, end_preview, flag, option, extension } = req.body
  console.log(comment, start_dt, end_dt, start_preview, end_preview, flag, option, extension)
  try {
    const [data] = await pool.query('INSERT INTO election(admin_id, comment, start_dt, end_dt, start_preview, end_preview, flag, noption, extension) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, comment, start_dt, end_dt, start_preview, end_preview, flag, option, extension])
    return res.json(Results.onSuccess(data.insertId))

  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }
}

controller.setVoterAdd = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params
  const file = req.file
  try {
    console.log(req.file)

    const excelFile = xlsx.read(file.buffer)
    // @breif 엑셀 파일의 첫번째 시트의 정보를 추출
    const sheetName = excelFile.SheetNames[0];          // @details 첫번째 시트 정보 추출
    const firstSheet = excelFile.Sheets[sheetName];       // @details 시트의 제목 추출

    // @details 엑셀 파일의 첫번째 시트를 읽어온다.

    const jsonData = xlsx.utils.sheet_to_json(firstSheet, { defval: "" });
    let values = [];
    let phone = []
    for (let i = 0; i < jsonData.length; i++) {
      values.push([id, jsonData[i].이름, jsonData[i].생년월일, jsonData[i].핸드폰, jsonData[i].성별])
      phone.push(jsonData[i].핸드폰)
    }
    console.log(values)
    const [data] = await pool.query('INSERT IGNORE INTO  voter(admin_id, username, days, phone, gender) VALUES  ?', [values])
    let result = {}
    result.voter_count = data.affectedRows
    console.log(phone)
    const [data1] = await pool.query('INSERT INTO vote(election_id, voter_id, days) SELECT ?, id, NULL FROM voter WHERE phone in (?)', [election, phone])
    result.vote_count = data1.affectedRows
    return res.json(Results.onSuccess(result))
  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }

}


controller.getElection = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params
  try {

    const [data] = await pool.query('SELECT * FROM election WHERE id = ?', [election])

    let result = {}
    result.data = data[0]
    const [vote] = await pool.query('SELECT voter_id FROM vote WHERE election_id = ?', [election])
    if (vote.length != 0) {
      const vote_list = vote.map(x => x.voter_id)
      const [voter] = await pool.query('SELECT COUNT(*) as count FROM voter WHERE id in (?) ', [vote_list])
      result.voter_count = voter[0].count
    }
    else {
      result.voter_count = 0
    }
    result.vote_count = vote.length

    return res.json(Results.onSuccess(result))
  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }
}

controller.getCandidate = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params
  try {

    const [data] = await pool.query('SELECT candidate.*, voter.username FROM candidate, voter WHERE voter.id = candidate.voter_id AND election_id = ?', [election])

    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }
}
controller.setCandidate = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params
  try {

    const [data] = await pool.query('SELECT * FROM election WHERE id = ?', [election])

    let result = {}
    result.data = data[0]
    const [vote] = await pool.query('SELECT voter_id FROM vote WHERE election_id = ?', [election])
    const vote_list = vote.map(x => x.voter_id)
    const [voter] = await pool.query('SELECT COUNT(*) as count FROM voter WHERE id in (?) ', [vote_list])
    result.vote_count = vote.length
    result.voter_count = voter[0].count
    return res.json(Results.onSuccess(result))
  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }

}


controller.getCandidateList = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params
  const { query } = req.query
  let strquery = "%"
  if (query != undefined) {
    strquery = query + "%"
  }

  try {

    const [data] = await pool.query('SELECT * FROM vote, voter WHERE voter.id = vote.voter_id AND election_id =? AND username LIKE (?)', [election, strquery])

    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }
}

module.exports = controller;