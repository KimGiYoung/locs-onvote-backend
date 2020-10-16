const logger = require("../../config/logger");
const Results = require("../../config/results");
const pool = require("../../database");
const nanoid = require('nanoid');
const xlsx = require("xlsx");

let controller = {}
/*
 pool.query 에서 [] 는 여러개의 결과값 가져올때
 [[]]는 단일 결과값 가져올때 쓴다
*/

let ElectionStatus = async (id, index) => {
  const [check] = await pool.query('SELECT flag FROM election WHERE admin_id = ? AND id = ?', [id, index])
  if (check.flag == 1) return 1
  else return 0
}

controller.getTest = async (req, res, next) => {
  let list = []
  for (let i = 0; i <= 100000; i++) {
    list.push(nanoid.nanoid(10))
  }
  return res.json(list)
}

controller.getExampleDownload = async (req, res, next) => {
  var test = [['이름', '생년월일', '핸드폰', '성별'], ['홍길동', '1988-01-01', '010-1234-4567', '남'], ['이순신', '1989-05-12', '010-4567-1234', '남'], ['나홍순', '1999-03-03', '010-5678-1597', '여']];
  var ws_name = 'example';
  let book = xlsx.utils.book_new();
  // let ws = xlsx.utils.json_to_sheet(data);
  let ws = xlsx.utils.aoa_to_sheet(test);
  xlsx.utils.book_append_sheet(book, ws, ws_name);
  var buf = xlsx.write(book, { type: 'buffer', bookType: "xlsx" });
  res.setHeader('Content-Disposition', 'attachment; filename="example.xlsx');
  return res.send(buf)
}

controller.getVoterDownload = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params

  let [data] = await pool.query('SELECT username as "이름", birthday as "생년월일", phone as "핸드폰", gender as "성별" FROM voter WHERE election_id = ?', [election])
  var ws_name = 'SheetJS';
  let book = xlsx.utils.book_new();
  let ws = xlsx.utils.json_to_sheet(data);
  xlsx.utils.book_append_sheet(book, ws, ws_name);
  var buf = xlsx.write(book, { type: 'buffer', bookType: "xlsx" });
  res.setHeader('Content-Disposition', 'attachment; filename="voter.xlsx');
  return res.send(buf)
}


controller.getElectionList = async (req, res, next) => {
  const { id } = req.decoded
  // const { start, end } = req.query

  let query = ""

  try {
    const [data] = await pool.query('SELECT * FROM election WHERE admin_id = ? AND flag in (0, 1) ', [id])
    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }
}
controller.getElectionShortList = async (req, res, next) => {
  const { id } = req.decoded
  const { flag } = req.query
  const strflag = flag.split(',')
  try {
    const [data] = await pool.query('SELECT id, name, flag FROM election WHERE admin_id = ? AND flag IN(?)', [id, strflag])
    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }

}

controller.setElectionList = async (req, res, next) => {
  const { id } = req.decoded
  const { name, start_dt, end_dt, start_preview, end_preview, option, extension } = req.body
  const [file] = req.files

  try {
    const [data] = await pool.query('INSERT INTO election(admin_id, name, start_dt, end_dt, start_preview, end_preview, flag, noption, extension) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, name, start_dt, end_dt, start_preview, end_preview, 0, option, extension])
    const election = data.insertId
    const excelFile = xlsx.read(file.buffer)
    // @breif 엑셀 파일의 첫번째 시트의 정보를 추출
    const sheetName = excelFile.SheetNames[0];          // @details 첫번째 시트 정보 추출
    const firstSheet = excelFile.Sheets[sheetName];       // @details 시트의 제목 추출

    // @details 엑셀 파일의 첫번째 시트를 읽어온다.

    const jsonData = xlsx.utils.sheet_to_json(firstSheet, { defval: "" });
    let values = [];
    for (let i = 0; i < jsonData.length; i++) {
      values.push([election, jsonData[i].이름, jsonData[i].생년월일, jsonData[i].핸드폰, jsonData[i].성별, nanoid.nanoid(10)])

    }
    const [data1] = await pool.query('INSERT INTO  voter(election_id, username, birthday, phone, gender, code) VALUES  ?', [values])
    const reuslt = { count: data1.affectedRows }
    return res.json(Results.onSuccess(reuslt))

  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }
}

controller.putElectionList = async (req, res, next) => {
  const { id } = req.decoded
  const { index, name, start_dt, end_dt, start_preview, end_preview, option, extension } = req.body
  const [file] = req.files

  try {

    const [check] = await pool.query('SELECT flag FROM election WHERE admin_id = ? AND id = ?', [id, index])

    if (check.flag == 1) return res.json(Results.onFailure("현재 진행중입니다."))

    await pool.query('UPDATE election SET name=?, start_dt=?, end_dt=?, start_preview=?, end_preview=?, noption=?, extension=?  WHERE admin_id=? AND id=?', [name, start_dt, end_dt, start_preview, end_preview, option, extension, id, index])
    const election = index
    if (file != undefined) {

      const excelFile = xlsx.read(file.buffer)
      // @breif 엑셀 파일의 첫번째 시트의 정보를 추출
      const sheetName = excelFile.SheetNames[0];          // @details 첫번째 시트 정보 추출
      const firstSheet = excelFile.Sheets[sheetName];       // @details 시트의 제목 추출

      // @details 엑셀 파일의 첫번째 시트를 읽어온다.

      const jsonData = xlsx.utils.sheet_to_json(firstSheet, { defval: "" });
      let values = [];
      for (let i = 0; i < jsonData.length; i++) {
        values.push([election, jsonData[i].이름, jsonData[i].생년월일, jsonData[i].핸드폰, jsonData[i].성별, nanoid.nanoid(10)])
      }
      await pool.query('DELETE FROM voter WHERE election_id = ?', [election])
      const [data1] = await pool.query('INSERT INTO voter(election_id, username, birthday, phone, gender, code) VALUES  ?', [values])
      return res.json(Results.onSuccess(data1.affectedRows))
    }
    return res.json(Results.onSuccess(1))

  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }
}


controller.deleteElectionList = async (req, res, next) => {
  const { id } = req.decoded
  const { index } = req.query


  try {

    const [check] = await pool.query('SELECT flag FROM election WHERE admin_id = ? AND id = ?', [id, index])
    if (check.flag == 1) return res.json(Results.onFailure("현재 진행중입니다."))
    const [[candiate]] = await pool.query('SELECT COUNT(*) as count FROM candidate WHERE election_id = ? ', [index])
    if (candiate.count > 0) return res.json(Results.onFailure("후보자가 등록되어있습니다."))
    await pool.query('DELETE FROM election WHERE admin_id = ? AND id = ?', [id, index])

    return res.json(Results.onSuccess({ id: index }))

  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }
}


controller.getElection = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params
  try {

    const [[data]] = await pool.query('SELECT election.*, COUNT(*) as count FROM election, voter WHERE election.id = ? AND election.id = voter.election_id GROUP BY election.id', [election])

    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }
}

controller.getCandidate = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params
  try {

    const [data] = await pool.query('SELECT candidate.*, voter.username FROM candidate, voter WHERE voter.id = candidate.voter_id AND voter.election_id = ?', [election])

    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }
}

controller.getDetailsCandidate = async (req, res, next) => {
  const { id } = req.decoded
  const { candidate } = req.params
  try {
    const [[data]] = await pool.query('SELECT candidate.*, voter.username FROM candidate, voter WHERE voter.id = candidate.voter_id AND candidate.id = ?', [candidate])

    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }
}

controller.setCandidate = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params
  const { voter_id, symbol, team, pledge, youtube } = req.body
  const files = req.files
  let pdf_path = "", img_path = ""
  try {
    if (files != undefined) {
      if (files.img != undefined) {
        pdf_path = files.img[0].path
      }
      if (files.pdf != undefined) {
        img_path = files.pdf[0].path
      }

    }
    const [voter] = await pool.query('SELECT * FROM voter WHERE id = ?', [voter_id])

    if (voter.length == 0) {
      return res.json(Results.onFailure("후보자 정보가 없습니다"))
    }

    const [[data]] = await pool.query('SELECT noption FROM election WHERE id = ?', [election])
    if (data.noption == 0) //단일
    {
      let [[count]] = await pool.query('SELECT count(*) as COUNT FROM candidate WHERE election_id = ?', [election])
      console.log(count.COUNT)
      if (count.COUNT >= 2) {
        return res.json(Results.onFailure("단일후보가 있습니다."))
      }
      let list = []
      list.push([election, voter_id, "찬성", team, pledge, pdf_path, img_path, youtube])
      list.push([election, voter_id, "반대", team, pledge, pdf_path, img_path, youtube])
      console.log(list)
      const data = await pool.query('INSERT INTO candidate(election_id, voter_id, symbol, team, pledge, pdf_path, img_path, youtube_path) VALUES ?', [list])
      return res.json(Results.onSuccess({ id: data.insertId }))
    }
    else {
      let [[count]] = await pool.query('SELECT count(*) as COUNT FROM candidate WHERE voter_id = ? AND election_id = ? ', [voter_id, election])
      console.log(count.COUNT)
      if (count.COUNT >= 1) {
        return res.json(Results.onFailure("동일한 후보가 있습니다."))
      }
      const data = await pool.query('INSERT INTO candidate(election_id, voter_id, symbol, team, pledge, pdf_path, img_path, youtube_path) VALUES ?', [election, voter_id, symbol, team, pledge, pdf_path, img_path, youtube])
      return res.json(Results.onSuccess({ id: data.insertId }))
    }


  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }

}

controller.putCandidate = async (req, res, next) => {
  const { id } = req.decoded
  const { candidate } = req.params
  const { voter_id, symbol, team, pledge, youtube } = req.body
  const files = req.files
  let pdf_path = "", img_path = ""
  try {
    if (files != undefined) {
      if (files.img != undefined) {
        pdf_path = files.img[0].path
      }
      if (files.pdf != undefined) {
        img_path = files.pdf[0].path
      }

    }

    const [[data]] = await pool.query('SELECT * FROM candidate, election WHERE candidate.election_id = election.id AND candidate.id =  ?', [candidate])
    let election = data.election_id
    let flag = data.flag
    if (flag == 1) return res.json(Results.onFailure("선거가 시작중입니다"))

    const [voter] = await pool.query('SELECT * FROM voter WHERE id = ?', [voter_id])

    if (voter.length == 0) {
      return res.json(Results.onFailure("후보자 정보가 없습니다"))
    }


    if (data.noption == 0) //단일
    {

      const [data] = await pool.query('UPDATE candidate set voter_id=?, team=?, pledge=?, pdf_path=?, img_path=?, youtube_path=? WHERE election_id = ?', [voter_id, team, pledge, pdf_path, img_path, youtube, election])
      console.log(data)
      return res.json(Results.onSuccess({ id: candidate }))
    }
    else {
      let [[count]] = await pool.query('SELECT count(*) as COUNT FROM candidate WHERE voter_id = ? AND election_id = ? ', [voter_id, election])
      if (count.COUNT >= 1) {
        return res.json(Results.onFailure("동일한 후보가 있습니다."))
      }
      const [data] = await pool.query('UPDATE candidate set voter_id=?, symbol=?, team=?, pledge=?, pdf_path=?, img_path=?, youtube_path=? WHERE election_id = ?', [voter_id, symbol, team, pledge, pdf_path, img_path, youtube, election])


      return res.json(Results.onSuccess({ id: candidate }))
    }


  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }

}


controller.deleteCandidate = async (req, res, next) => {
  const { id } = req.decoded
  const { candidate } = req.params

  try {

    const [[data]] = await pool.query('SELECT * FROM candidate, election WHERE candidate.election_id = election.id AND candidate.id =  ?', [candidate])
    let election = data.election_id
    let flag = data.flag
    if (flag == 1) return res.json(Results.onFailure("선거가 시작중입니다"))


    if (data.noption == 0) //단일
    {

      await pool.query('DELETE FROM candidate WHERE election_id = ?', [election])
      return res.json(Results.onSuccess({ id: candidate }))
    }
    else {
      await pool.query('DELETE FROM candidate WHERE id = ?', [candidate])

      return res.json(Results.onSuccess({ id: candidate }))
    }


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

    const [data] = await pool.query('SELECT * FROM voter WHERE election_id =? AND username LIKE (?)', [election, strquery])

    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("ERROR"))
  }
}

module.exports = controller;