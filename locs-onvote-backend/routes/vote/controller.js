const pool = require("../../database");
const logger = require("../../config/logger");
const Results = require("../../config/results");
const { nanoid } = require("nanoid");
const xlsx = require("xlsx");
let controller = {}

controller.getTest = async (req, res, next) => {
  const data = [0, 1, 2, 1, 2, 1, 0, null, null, 0, null]
  const value = data.reduce((allNames, name) => {

    if (name in allNames) {
      allNames[name]++
    }
    else {
      allNames[name] = 1
    }
    return allNames
  }, {})

  return res.json(value)
}


controller.getballotList = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params
  try {
    const [data] = await pool.query('SELECT ballot.id, ballot.flag, ballot.ballotdate, voter.username, voter.phone, voter.birthday FROM ballot, voter WHERE voter.id = ballot.voter_id AND ballot.election_id =? ORDER BY ballot.id ', [election])

    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}

controller.setballotList = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params
  const { voter_id } = req.body
  try {
    const [[check]] = await pool.query('SELECT flag FROM election WHERE id = ?', [election])
    if (check.flag === 2) {
      return res.json(Results.onFailure("완료된 선거 입니다."))
    }
    const [voter] = await pool.query('SELECT phone FROM voter WHERE id = ? ', [voter_id])

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
      const [[check]] = await pool.query('SELECT * FROM ballot WHERE election_id = ? AND voter_id = ?', [election, voter_id])
      if (check != undefined) return res.json(Results.onFailure("등록된 개표확인자 입니다"))
      const [data] = await pool.query('INSERT INTO  ballot(election_id, voter_id, flag, code) VALUES (?, ?, ?, ?)', [election, voter_id, 0, nanoid(10)])
      await pool.query(`
        UPDATE ballot AS b1, voter AS v1, (SELECT MIN(ballot.code) AS code, voter.phone  FROM  ballot, voter WHERE ballot.voter_id = voter.id  GROUP BY voter.username, voter.phone) AS b2
        SET b1.code= b2.code
        WHERE v1.phone = b2.phone AND b1.voter_id = v1.id 
      `, [])

      return res.json(Results.onSuccess({ id: data.insertId }))
    }

  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}



controller.deleteballotList = async (req, res, next) => {
  const { id } = req.decoded
  const { election, ballot } = req.params
  try {
    const [[check]] = await pool.query('SELECT flag FROM election WHERE id = ?', [election])
    if (check.flag === 2) {
      return res.json(Results.onFailure("완료된 선거 입니다."))
    }
    const [data] = await pool.query('DELETE FROM ballot WHERE election_id = ? AND id = ?', [election, ballot])

    return res.json(Results.onSuccess({ id: ballot }))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
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
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}


controller.getElectionList = async (req, res, next) => {
  const { id } = req.decoded

  try {

    const [data] = await pool.query('SELECT  election.id, election.name, election.start_dt, election.end_dt, election.flag, election.extension, COUNT(*) AS `all`, COUNT(IF(voter.flag=1, voter.flag, NULL)) AS `count`, COUNT(IF(voter.flag=1, voter.flag, NULL))/COUNT(*)*100 AS rate FROM election JOIN voter WHERE admin_id = ? AND election.id = voter.election_id AND election.flag = 1 GROUP BY election.name, election.flag, election.start_dt, election.end_dt, election.id ORDER BY election.start_dt desc', [id])
    return res.json(Results.onSuccess(data))

  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}

controller.getVoteList = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params
  const { pageNum, limit, search, flag, start, end } = req.query
  let npageNum = Number(pageNum) || 1  // NOTE: 쿼리스트링으로 받을 페이지 번호 값, 기본값은 1
  const contentSize = 10 // NOTE: 페이지에서 보여줄 컨텐츠 수.
  let nlimit = Number(limit) || 10
  let query = ""

  const skipSize = (npageNum - 1) * contentSize // NOTE: 다음 페이지 갈 때 건너뛸 

  try {
    if (search !== undefined && search !== "null") {
      query += `AND (username LIKE ('%${search}%') OR phone LIKE('%${search}%') OR birthday LIKE ('%${search}%')) `
    }
    if (flag != "null" && flag !== undefined) {
      query += `AND flag = ${flag} `
    }
    if (start != "null" && end != "null" && start != undefined && end != undefined) {
      query += `AND DATE(votedate) BETWEEN '${start}' AND '${end}'`
    }


    const [[vote]] = await pool.query(`SELECT count(*) as count FROM voter WHERE election_id = ? ${query}`, [election])
    const totalCount = Number(vote.count)

    const [data] = await pool.query(`SELECT * FROM voter WHERE election_id = ? ${query} ORDER BY id LIMIT ?, ?`, [election, skipSize, nlimit])

    const result = {
      pageNum,
      totalCount,
      contents: data,
    }
    return res.json(Results.onSuccess(result))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}


controller.putElectionInvalid = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.body
  const electionlist = election.split(',')
  let connection = await pool.getConnection(async conn => conn)
  try {
    await connection.beginTransaction()

    let bElection = electionlist.map(async data => {
      const [[check]] = await connection.query('SELECT name,flag FROM election WHERE id = ?', [data])

      if (check == undefined) return -1
      if (check.flag == 2 || check.flag == 3) {
        return 1
      }
      await connection.query('UPDATE election SET flag = 3 WHERE id = ?', [data])
      await connection.query('INSERT INTO vote_logs(ip, admin_id, text) VALUES (?,?,?)', [logger.getIP(req), id, `[${check.name}] 선거를 무효하였습니다`])
      return 0
    })
    let bElection_check = await Promise.all(bElection)
    if (bElection_check.indexOf(1) != -1) {
      await connection.rollback()
      connection.release()
      return res.json(Results.onFailure("선거를  무효 할 수 없습니다"))

    }

    await connection.commit()
    connection.release()
    return res.json(Results.onSuccess({ id: electionlist }))
  } catch (error) {
    await connection.rollback()
    connection.release()
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}


controller.putElectionAddDate = async (req, res, next) => {
  const { id } = req.decoded
  const { election, end } = req.body
  const electionlist = election.split(',')

  const tEnd = new Date(end).toLocaleString('ko-KR', { hour12: false })
  const tReqEnd = Math.floor(new Date(end).getTime() / 1000)
  const now = Math.floor(new Date().getTime() / 1000)
  if (now > tReqEnd) {
    return res.json(Results.onFailure("선거를 연장 할 수 없습니다"))
  }
  let connection = await pool.getConnection(async conn => conn)
  try {
    await connection.beginTransaction()

    let bElection = electionlist.map(async data => {
      const [[check]] = await connection.query('SELECT name,flag, extension, UNIX_TIMESTAMP(start_dt) AS start_dt FROM election WHERE id = ?', [data])
      if (check.start_dt > tReqEnd) {
        return 1
      }

      if (check.flag == 2 || check.flag == 3 || check.extension == 0) {
        return 1
      }
      await connection.query('UPDATE election SET end_dt = ? WHERE id = ?', [tEnd, data])
      await connection.query('INSERT INTO vote_logs(ip, admin_id, text) VALUES (?,?,?)', [logger.getIP(req), id, `[${check.name}] 선거를 연장하였습니다`])
      return 0
    })

    let bElection_check = await Promise.all(bElection)

    if (bElection_check.indexOf(1) != -1) {
      await connection.rollback()
      connection.release()
      return res.json(Results.onFailure("선거를 연장 할 수 없습니다"))

    }

    await connection.commit()
    connection.release()
    return res.json(Results.onSuccess({ id: electionlist }))
  } catch (error) {
    await connection.rollback()
    connection.release()
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}


controller.getElectionCounting = async (req, res, next) => {
  const { id } = req.decoded
  // const {  } = req.params

  try {
    const [data] = await pool.query('SELECT election.id, election.name,  COUNT(ballot.election_id) AS total , COUNT(IF(ballot.flag=1, 1, NULL)) AS count  FROM election LEFT JOIN ballot ON election.id = ballot.`election_id` WHERE election.flag = 2 AND election.admin_id = ? AND election.voteflag = 0 GROUP BY election.id ORDER BY election.id ', [id])
    const Election = await data.map(async data => {
      const [[result]] = await pool.query(`
      SELECT  COUNT(*) AS usertotal, COUNT(IF(voter.flag=1, 1, NULL)) AS usercount
    FROM election, voter
     WHERE election.voteflag=1 AND election.flag = 2 AND  election.id = voter.election_id  AND election.id = ?
      `, [data.id])
      return { id: data.id, name: data.name, total: data.total, count: data.count, usertotal: result.usertotal, usercount: result.usercount }
    })
    let bElection_check = await Promise.all(Election)
    return res.json(Results.onSuccess(bElection_check))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}


controller.setElectionCounting = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params

  try {

    const [[data]] = await pool.query('SELECT COUNT(*) as total, COUNT(IF(flag=1, 1, NULL)) as count FROM ballot WHERE election_id = ?', [election])

    if (data.total != data.count) return res.json(Results.onFailure("모든 개표확인자가 확인하지 않았습니다"))

    await pool.query('UPDATE election SET voteflag=1 WHERE id = ?', [election])

    return res.json(Results.onSuccess({ id: electionlist }))
  } catch (error) {
    connection.rollback()
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}

controller.setElectionGroupCounting = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.body

  const electionlist = election.split(',')
  try {

    const [ballot] = await pool.query(`
      SELECT election.id, election.name, COUNT(ballot.election_id) AS total , COUNT(IF(ballot.flag=1, 1, NULL)) AS count  FROM 
      election LEFT JOIN ballot ON election.id = ballot.election_id WHERE election.flag = 2 AND election.admin_id = ?
      AND election.id IN (?)
      GROUP BY election.id      
      
    `, [id, electionlist])

    for (let data of ballot) {
      if (data.total != data.count) return res.json(Results.onFailure("모든 개표확인자가 확인하지 않았습니다"))
    }

    await pool.query('UPDATE election SET voteflag=1 WHERE id in (?)', [electionlist])

    return res.json(Results.onSuccess({ id: electionlist }))
  } catch (error) {

    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}


controller.getVoteResult = async (req, res, next) => {
  const { id } = req.decoded
  const { start, end } = req.query
  try {
    let query = `SELECT election.id, election.name, election.start_dt, election.end_dt, election.noption, COUNT(*) AS total, COUNT(IF(voter.flag=1, 1, NULL)) AS count
    FROM election, voter
     WHERE election.voteflag=1 AND election.flag = 2 AND  election.id = voter.election_id AND election.admin_id = ${id} 
    GROUP BY election.id, election.name, election.start_dt, election.end_dt, election.noption  ORDER BY election.id `

    if (start != 'null' && end != 'null') {
      query = `SELECT election.id, election.name, election.start_dt, election.end_dt, election.noption, COUNT(*) AS total, COUNT(IF(voter.flag=1, 1, NULL)) AS count
      FROM election, voter
       WHERE election.voteflag=1 AND election.flag = 2 AND  election.id = voter.election_id AND election.admin_id = ${id} AND DATE(election.end_dt) BETWEEN '${start}' AND '${end}'
      GROUP BY election.id, election.name, election.start_dt, election.end_dt, election.noption  ORDER BY election.id   `
    }

    const [eleciton] = await pool.query(query, [])
    if (eleciton.length == 0) return res.json(Results.onSuccess(eleciton))
    const result = eleciton.map(async data => {
      let json = {}
      json = data
      let num = Math.floor((data.count / data.total) * 100)
      if (num === Infinity) num = 0
      json.rate = num


      let [[nullcount]] = await pool.query(`
      SELECT  COUNT(IF(IFNULL(candidate_id,0)=0, 1, NULL)) AS count FROM vote_result WHERE  election_id = ?
      `, [data.id])

      const [vote] = await pool.query(`
      SELECT candidate.id, candidate.team, candidate.symbol, voter.username FROM voter, candidate WHERE voter.id = candidate.voter_id AND voter.election_id = ?
      `, [data.id])

      if (vote.length == 0) {
        json.data = [{ username: "기권", team: "기권", count: nullcount.count }]
        json.result = "무효"
        return json
      }
      let voteCount = vote.map(async data => {
        const [[ncount]] = await pool.query(`SELECT COUNT(*) AS count FROM vote_result WHERE candidate_id = ?`, [data.id])
        return { username: data.username, team: data.team, count: ncount.count, symbol: data.symbol }
      })



      let count = await Promise.all(voteCount)

      count.push({ username: "기권", team: "기권", count: nullcount.count })

      const candidate = count.sort((a, b) => {
        return b["count"] - a["count"]
      })

      json.data = candidate

      if (data.noption == 0) {
        if (candidate[0].symbol === "찬성") {
          json.result = "가결"
        }
        else if (candidate[0].symbol === "반대") {
          json.result = "부결"
        }
        else {
          json.result = "무효"
        }

        if (candidate[0].count === candidate[1].count) {
          json.result = "동점"
        }

      }
      else {
        if (candidate[0].username == "기권") {
          json.result = `${candidate[1].team}(${candidate[1].username})`
        }
        else {
          json.result = `${candidate[0].team}(${candidate[0].username})`
        }
        if (candidate[0].count === candidate[1].count) {
          json.result = "동점"
        }
      }
      return json
    })

    let resjson = await Promise.all(result)
    return res.json(Results.onSuccess(resjson))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}


controller.getVoteResultExcel = async (req, res, next) => {
  const { id } = req.decoded
  const { start, end } = req.query
  try {
    let query = `SELECT election.id, election.name, election.start_dt, election.end_dt, election.noption, COUNT(*) AS total, COUNT(IF(voter.flag=1, 1, NULL)) AS count
    FROM election, voter
     WHERE election.voteflag=1 AND election.flag = 2 AND  election.id = voter.election_id AND election.admin_id = ${id} 
    GROUP BY election.id, election.name, election.start_dt, election.end_dt, election.noption  ORDER BY election.id  `

    if (start != 'null' && end != 'null') {
      query = `SELECT election.id, election.name, election.start_dt, election.end_dt, election.noption, COUNT(*) AS total, COUNT(IF(voter.flag=1, 1, NULL)) AS count
      FROM election, voter
       WHERE election.voteflag=1 AND election.flag = 2 AND  election.id = voter.election_id AND election.admin_id = ${id} AND DATE(election.end_dt) BETWEEN '${start}' AND '${end}'
      GROUP BY election.id, election.name, election.start_dt, election.end_dt, election.noption  ORDER BY election.id `
    }

    const [eleciton] = await pool.query(query, [])



    let candidate_list = {}
    const result = eleciton.map(async data => {
      let json = {}
      json.선거명 = data.name
      let num = Math.floor((data.count / data.total) * 100)
      if (num === Infinity) num = 0
      json.투표율 = num
      json.유권자 = data.total
      json.투표자 = data.count


      let [[nullcount]] = await pool.query(`
      SELECT  COUNT(IF(IFNULL(candidate_id,0)=0, 1, NULL)) AS count FROM vote_result WHERE  election_id = ?
      `, [data.id])

      const [vote] = await pool.query(`
      SELECT candidate.id, voter.username FROM voter, candidate WHERE voter.id = candidate.voter_id AND voter.election_id = ? 
      `, [data.id])

      if (vote.length == 0) {
        candidate_list[data.name] = [{ "이름": "기권", "투표수": nullcount.count }]
        return json
      }
      let voteCount = vote.map(async data => {
        const [[ncount]] = await pool.query(`SELECT COUNT(*) AS count FROM vote_result WHERE candidate_id = ?`, [data.id])
        return { "이름": data.username, "투표수": ncount.count }
      })

      let count = await Promise.all(voteCount)

      count.push({ "이름": "기권", "투표수": nullcount.count })

      const candidate = count.sort((a, b) => {
        return b["투표수"] - a["투표수"]
      })

      candidate_list[data.name] = candidate
      if (data.noption == 0) {
        if (candidate[0].symbol === "찬성") {
          json.result = "가결"
        }
        else if (candidate[0].symbol === "반대") {
          json.result = "부결"
        }
        else {
          json.result = "무효"
        }

        if (candidate[0].count === candidate[1].count) {
          json.result = "동점"
        }
      }
      else {
        if (candidate[0].username == "기권") {
          json.result = `${candidate[1].team}(${candidate[1].username})`
        }
        else {
          json.result = `${candidate[0].team}(${candidate[0].username})`
        }
        if (candidate[0].count === candidate[1].count) {
          json.result = "동점"
        }

      }
      return json
    })

    let resjosn = await Promise.all(result)

    let ws_name = '전체';
    let book = xlsx.utils.book_new();
    let ws = xlsx.utils.json_to_sheet(resjosn);
    xlsx.utils.book_append_sheet(book, ws, ws_name);
    console.log(Object.keys(candidate_list))
    for (let data1 in resjosn) {

      ws_name = resjosn[data1].선거명
      console.log(candidate_list[ws_name])
      ws = xlsx.utils.json_to_sheet(candidate_list[ws_name]);
      xlsx.utils.book_append_sheet(book, ws, ws_name);
    }

    var buf = xlsx.write(book, { type: 'buffer', bookType: "xlsx" });
    res.setHeader('Content-Disposition', 'attachment; filename="reuslt.xlsx');
    return res.send(buf)

  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}

controller.getVoteLogs = async (req, res, next) => {
  const { id } = req.decoded
  try {

    const [logs] = await pool.query(`SELECT ip, create_date, text FROM vote_logs WHERE admin_id = ? ORDER BY create_date desc limit 50`, [id])


    return res.json(Results.onSuccess(logs))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("고객센터에 문의 바랍니다"))
  }
}


module.exports = controller;
