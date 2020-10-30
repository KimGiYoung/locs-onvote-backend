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

controller.getTest = async (req, res, next) => {
  let list = []
  for (let i = 0; i <= 100000; i++) {
    list.push(nanoid.nanoid(10))
  }
  return res.json(list)
}

controller.getExampleDownload = async (req, res, next) => {
  var test = [['이름', '생년월일', '핸드폰', '성별'], ['홍길동', '880101', '010-1234-4567', '남'], ['이순신', '890512', '010-4567-1234', '남'], ['나홍순', '990303', '010-5678-1597', '여']];
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
    const [data] = await pool.query('SELECT * FROM election WHERE admin_id = ? AND flag in (0, 1) ORDER BY id ', [id])
    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}
controller.getElectionShortList = async (req, res, next) => {
  const { id } = req.decoded
  const { flag } = req.query
  const strflag = flag.split(',')
  try {
    const [data] = await pool.query('SELECT id, name, flag, noption FROM election WHERE admin_id = ? AND flag IN(?) ORDER BY id', [id, strflag])
    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }

}

let isPhoneType = (data) => {
  const pattern = /[0-9]{3}-[0-9]{3,4}-[0-9]{4}/;
  return pattern.test(data);

}

let isBirhdayType = (data) => {
  const pattern = /[0-9]{2}[0-9]{2}[0-9]{2}/;
  return pattern.test(data);
}


controller.setElectionList = async (req, res, next) => {
  const { id } = req.decoded
  const { name, start_dt, end_dt, start_preview, end_preview, option, extension } = req.body
  const tStart_dt = new Date(start_dt).toLocaleString('ko-KR', { hour12: false })
  const tEnd_dt = new Date(end_dt).toLocaleString('ko-KR', { hour12: false })
  const tStart_preview = new Date(start_preview).toLocaleString('ko-KR', { hour12: false })
  const tEnd_preview = new Date(end_preview).toLocaleString('ko-KR', { hour12: false })

  const [file] = req.files
  let connection = await pool.getConnection(async conn => conn)
  try {

    await connection.beginTransaction(); // START TRANSACTION
    const [data] = await connection.query('INSERT INTO election(admin_id, name, start_dt, end_dt, start_preview, end_preview, flag, noption, extension, voteflag) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [id, name, tStart_dt, tEnd_dt, tStart_preview, tEnd_preview, 0, option, extension, 0])
    const election = data.insertId
    const excelFile = xlsx.read(file.buffer)
    // @breif 엑셀 파일의 첫번째 시트의 정보를 추출
    const sheetName = excelFile.SheetNames[0];          // @details 첫번째 시트 정보 추출
    const firstSheet = excelFile.Sheets[sheetName];       // @details 시트의 제목 추출

    // @details 엑셀 파일의 첫번째 시트를 읽어온다.

    const jsonData = xlsx.utils.sheet_to_json(firstSheet, { defval: "" });
    console.log(jsonData)
    let values = [];
    if (jsonData.length === 0) {
      connection.release()
      return res.json(Results.onFailure("유권자 명단 형식이 맞지 않습니다."))
    }
    let nNamelist = Object.keys(jsonData[0])
    let namelist = ["이름", "생년월일", "핸드폰", "성별"]
    if (nNamelist.join() !== namelist.join()) {
      connection.release()
      return res.json(Results.onFailure("유권자 명단 형식이 맞지 않습니다."))
    }

    for (let i = 0; i < jsonData.length; i++) {
      if (isBirhdayType(jsonData[i].생년월일) == false) {
        await connection.rollback()
        connection.release()
        return res.json(Results.onFailure(jsonData[i].이름 + "님의 생년월일유형이 잘못되었습니다."))
      }

      if (isPhoneType(jsonData[i].핸드폰) == false) {
        await connection.rollback()
        connection.release()
        return res.json(Results.onFailure(jsonData[i].이름 + "님의 핸드폰유형이 잘못되었습니다."))
      }
      values.push([election, jsonData[i].이름, jsonData[i].생년월일, jsonData[i].핸드폰, jsonData[i].성별, nanoid.nanoid(10)])

    }
    const [data1] = await connection.query('INSERT INTO  voter(election_id, username, birthday, phone, gender, code) VALUES  ?', [values])
    await connection.query(`
      UPDATE voter AS b1, (SELECT username, phone , MIN(code) AS code FROM voter GROUP BY phone, username ) AS b2
      SET b1.code=b2.code
      WHERE b1.phone = b2.phone 
    `, [])
    const reuslt = { id: data.insertId, count: data1.affectedRows }
    await connection.commit()
    connection.release()
    return res.json(Results.onSuccess(reuslt))

  } catch (error) {
    await connection.rollback()
    connection.release()
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}

controller.putElectionList = async (req, res, next) => {
  const { id } = req.decoded
  const { index, name, start_dt, end_dt, start_preview, end_preview, option, extension } = req.body
  const tStart_dt = new Date(start_dt).toLocaleString('ko-KR', { hour12: false })
  const tEnd_dt = new Date(end_dt).toLocaleString('ko-KR', { hour12: false })
  const tStart_preview = new Date(start_preview).toLocaleString('ko-KR', { hour12: false })
  const tEnd_preview = new Date(end_preview).toLocaleString('ko-KR', { hour12: false })

  const file = req.files
  let connection = await pool.getConnection(async conn => conn)
  try {

    const [[check]] = await connection.query('SELECT flag FROM election WHERE admin_id = ? AND id = ?', [id, index])


    if (check.flag == 1) {
      connection.release()
      return res.json(Results.onFailure("현재 선거가 진행중입니다."))
    }

    const [[check1]] = await connection.query('SELECT COUNT(*) AS count FROM candidate WHERE election_id =?', [index])
    const [[check2]] = await connection.query('SELECT COUNT(*) AS count FROM ballot WHERE election_id = ?', [index])
    if (check1 > 0) {
      connection.release()
      return res.json(Results.onFailure("후보자가 등록되어 있습니다."))
    }
    if (check2 > 0) {
      connection.release()
      return res.json(Results.onFailure("권한정보가 등록되어 있습니다."))
    }

    await connection.beginTransaction(); // START TRANSACTION
    await connection.query('UPDATE election SET name=?, start_dt=?, end_dt=?, start_preview=?, end_preview=?, noption=?, extension=?  WHERE admin_id=? AND id=?', [name, tStart_dt, tEnd_dt, tStart_preview, tEnd_preview, option, extension, id, index])
    const election = index

    if (file != undefined && file.length != 0) {
      const [[check1]] = await connection.query('SELECT COUNT(*) AS count FROM candidate WHERE election_id =?', [index])
      const [[check2]] = await connection.query('SELECT COUNT(*) AS count FROM ballot WHERE election_id = ?', [index])
      if (check1 > 0) {
        await connection.rollback()
        connection.release()
        return res.json(Results.onFailure("후보자가 등록되어 있습니다."))
      }
      if (check2 > 0) {
        await connection.rollback()
        connection.release()
        return res.json(Results.onFailure("권한정보가 등록되어 있습니다."))
      }
      const excelFile = xlsx.read(file[0].buffer)      // @breif 엑셀 파일의 첫번째 시트의 정보를 추출

      const sheetName = excelFile.SheetNames[0];          // @details 첫번째 시트 정보 추출
      const firstSheet = excelFile.Sheets[sheetName];       // @details 시트의 제목 추출

      // @details 엑셀 파일의 첫번째 시트를 읽어온다.

      const jsonData = xlsx.utils.sheet_to_json(firstSheet, { defval: "" });
      if (jsonData.length === 0) {
        connection.release()
        return res.json(Results.onFailure("유권자 명단 형식이 맞지 않습니다."))
      }
      let nNamelist = Object.keys(jsonData[0])
      let namelist = ["이름", "생년월일", "핸드폰", "성별"]
      if (nNamelist.join() !== namelist.join()) {
        await connection.rollback()
        connection.release()
        return res.json(Results.onFailure("유권자 명단 형식이 맞지 않습니다."))
      }
      let values = [];
      for (let i = 0; i < jsonData.length; i++) {
        if (isBirhdayType(jsonData[i].생년월일) == false) {
          await connection.rollback()
          connection.release()
          return res.json(Results.onFailure(jsonData[i].이름 + "님의 생년월일유형이 잘못되었습니다."))
        }

        if (isPhoneType(jsonData[i].핸드폰) == false) {
          await connection.rollback()
          connection.release()
          return res.json(Results.onFailure(jsonData[i].이름 + "님의 핸드폰유형이 잘못되었습니다."))
        }
        values.push([election, jsonData[i].이름, jsonData[i].생년월일, jsonData[i].핸드폰, jsonData[i].성별, nanoid.nanoid(10)])
      }
      await connection.query('DELETE FROM voter WHERE election_id = ?', [election])
      const [data1] = await connection.query('INSERT INTO voter(election_id, username, birthday, phone, gender, code) VALUES  ?', [values])
      await connection.commit()
      connection.release()
      return res.json(Results.onSuccess(data1.affectedRows))
    }
    await connection.commit()
    connection.release()
    return res.json(Results.onSuccess(1))

  } catch (error) {
    await connection.rollback()
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}


controller.deleteElectionList = async (req, res, next) => {
  const { id } = req.decoded
  const { index } = req.query


  try {

    const [[check]] = await pool.query('SELECT flag FROM election WHERE admin_id = ? AND id = ?', [id, index])
    if (check.flag === 1) return res.json(Results.onFailure(" 현재 선거가 진행중입니다"))
    const [[check1]] = await pool.query('SELECT COUNT(*) AS count FROM candidate WHERE election_id =?', [index])
    const [[check2]] = await pool.query('SELECT COUNT(*) AS count FROM ballot WHERE election_id = ?', [index])
    if (check1 > 0) return res.json(Results.onFailure("후보자가 등록되어 있습니다."))
    if (check2 > 0) return res.json(Results.onFailure("권한정보가 등록되어 있습니다."))
    await pool.query('DELETE FROM election WHERE admin_id = ? AND id = ?', [id, index])

    return res.json(Results.onSuccess({ id: index }))

  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}


controller.getElection = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params
  try {

    const [[data]] = await pool.query('SELECT election.*, COUNT(*) as count FROM election, voter WHERE election.id = ? AND election.id = voter.election_id GROUP BY election.id', [election])

    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}

controller.getCandidate = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params
  try {

    const [data] = await pool.query('SELECT candidate.*, voter.username FROM candidate, voter WHERE voter.id = candidate.voter_id AND voter.election_id = ? ORDER BY candidate.id', [election])

    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}

controller.getDetailsCandidate = async (req, res, next) => {
  const { id } = req.decoded
  const { candidate } = req.params
  try {
    const [[check]] = await pool.query('SELECT * FROM election, candidate WHERE election.id = candidate.election_id AND candidate.id = ? AND election.admin_id = ?', [candidate, id])
    if (check == undefined) {
      return res.json(Results.onFailure("잘못된 정보 입니다. 고객센터에 문의 바랍니다"))
    }

    const [[data]] = await pool.query('SELECT candidate.*, voter.username FROM candidate, voter WHERE voter.id = candidate.voter_id AND candidate.id = ?', [candidate])

    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
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
        img_path = files.img[0].path
      }
      if (files.pdf != undefined) {
        pdf_path = files.pdf[0].path
      }

    }
    const [[voter]] = await pool.query('SELECT * FROM voter WHERE id = ?', [voter_id])

    if (voter == undefined) {
      return res.json(Results.onFailure("후보자 정보가 없습니다"))
    }

    const [[data]] = await pool.query('SELECT flag,noption FROM election WHERE id = ?', [election])

    let flag = data.flag
    if (flag == 1) return res.json(Results.onFailure("현재 선거가 진행중입니다."))
    if (data.noption == 0) //단일
    {
      let [[check1]] = await pool.query('SELECT COUNT(*) AS count FROM candidate WHERE election_id = ?', [election])

      if (check1.count >= 2) {
        return res.json(Results.onFailure("단일후보가 있습니다."))
      }
      let list = []
      list.push([election, voter_id, "찬성", team, pledge, pdf_path, img_path, youtube])
      list.push([election, voter_id, "반대", team, pledge, pdf_path, img_path, youtube])
      const [data] = await pool.query('INSERT INTO candidate(election_id, voter_id, symbol, team, pledge, pdf_path, img_path, youtube_path) VALUES ?', [list])
      return res.json(Results.onSuccess({ id: data.insertId }))
    }
    else {
      let [[check1]] = await pool.query('SELECT COUNT(*) AS count FROM candidate WHERE voter_id = ? AND election_id = ? ', [voter_id, election])

      if (check1.count >= 1) {
        return res.json(Results.onFailure("동일한 후보가 있습니다."))
      }

      let [[check2]] = await pool.query('SELECT COUNT(*) AS count FROM candidate WHERE election_id = ? AND (symbol = ? OR team = ? )', [election, symbol, team])
      if (check2.count >= 1) {
        return res.json(Results.onFailure("동일한 기호나 팀명이 있습니다"))
      }
      const [data] = await pool.query('INSERT INTO candidate(election_id, voter_id, symbol, team, pledge, pdf_path, img_path, youtube_path) VALUES (?, ?, ?, ?, ?, ?, ? ,?)', [election, voter_id, symbol, team, pledge, pdf_path, img_path, youtube])
      return res.json(Results.onSuccess({ id: data.insertId }))
    }


  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }

}

controller.putCandidate = async (req, res, next) => {
  const { id } = req.decoded
  const { candidate } = req.params
  const { voter_id, symbol, team, pledge, youtube } = req.body
  const files = req.files
  let pdf_path = "", img_path = ""
  let connection = await pool.getConnection(async conn => conn)
  try {
    await connection.beginTransaction()
    if (files != undefined) {
      const [[data]] = await connection.query('SELECT img_path, pdf_path FROM candidate WHERE id = ?', candidate)
      if (files.img != undefined) {
        img_path = files.img[0].path
      }
      else {
        img_path = data.img_path
      }

      if (files.pdf != undefined) {
        pdf_path = files.pdf[0].path
      }
      else {
        pdf_path = data.pdf_path
      }
    }

    const [[data]] = await connection.query('SELECT * FROM candidate, election WHERE candidate.election_id = election.id AND candidate.id =  ?', [candidate])
    let election = data.election_id
    let flag = data.flag
    if (flag == 1) {
      await connection.rollback()
      connection.release()
      return res.json(Results.onFailure("현재 선거가 진행중입니다."))
    }

    const [voter] = await connection.query('SELECT * FROM voter WHERE id = ?', [voter_id])

    if (voter.length == 0) {
      await connection.rollback()
      connection.release()
      return res.json(Results.onFailure("후보자 정보가 없습니다"))
    }

    if (data.noption == 0) //단일
    {
      const [data] = await connection.query('UPDATE candidate set voter_id=?, team=?, pledge=?,pdf_path=?, img_path=?, youtube_path=? WHERE election_id = ?', [voter_id, team, pledge, pdf_path, img_path, youtube, election])
    }
    else {
      const [data] = await connection.query('UPDATE candidate set voter_id=?, symbol=?, team=?, pledge=?, pdf_path=?, img_path=?, youtube_path=? WHERE id = ?', [voter_id, symbol, team, pledge, pdf_path, img_path, youtube, candidate])
      let [[count]] = await connection.query('SELECT count(*) as COUNT FROM candidate WHERE voter_id = ? AND election_id = ? ', [voter_id, election])

      if (count.COUNT >= 2) {
        await connection.rollback()
        connection.release()
        return res.json(Results.onFailure("동일한 후보가 있습니다."))
      }

      let [[check]] = await connection.query('SELECT count(*) as count FROM candidate WHERE election_id = ? AND symbol = ?', [election, symbol])
      if (check.count >= 1) {
        await connection.rollback()
        connection.release()

        return res.json(Results.onFailure("동일한 기호명이 있습니다"))
      }
    }

    await connection.commit()
    connection.release()
    return res.json(Results.onSuccess({ id: candidate }))

  } catch (error) {
    await connection.rollback()
    connection.release()
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }

}


controller.deleteCandidate = async (req, res, next) => {
  const { id } = req.decoded
  const { candidate } = req.params

  try {

    const [[data]] = await pool.query('SELECT * FROM candidate, election WHERE candidate.election_id = election.id AND candidate.id =  ?', [candidate])
    let election = data.election_id
    let flag = data.flag
    if (flag == 1) return res.json(Results.onFailure("현재 선거가 진행중입니다."))


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
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
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

    const [data] = await pool.query('SELECT * FROM voter WHERE election_id =? AND username LIKE (?) ORDER BY id', [election, strquery])

    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}


module.exports = controller;