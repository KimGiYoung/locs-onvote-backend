const pool = require("../../database");
const logger = require("../../config/logger");
const Results = require("../../config/results");
const { nanoid } = require("nanoid");
const xlsx = require("xlsx");
let controller = {}

controller.getTest = async (req, res, next) => {
  const data = [0, 1, 2, 1, 2, 1, 0, null, null, 0, null]
  const value = data.reduce((allNames, name) => {
    console.log(name)
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
      const [[check]] = await pool.query('SELECT * FROM ballot WHERE election_id = ? AND voter_id = ?', [election, voter_id])
      if (check != undefined) return res.json(Results.onFailure("등록된 개표확인자 입니다"))
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

    const [data] = await pool.query('SELECT  election.id, election.name, election.start_dt, election.end_dt, election.flag, election.extension, COUNT(*) AS `all`, COUNT(IF(voter.flag=1, voter.flag, NULL)) AS `count`, COUNT(IF(voter.flag=1, voter.flag, NULL))/COUNT(*)*100 AS rate FROM election JOIN voter WHERE admin_id = ? AND election.id = voter.election_id AND election.flag = 1 GROUP BY election.name, election.flag, election.start_dt, election.end_dt, election.id ORDER BY election.start_dt desc', [id])
    return res.json(Results.onSuccess(data))

  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
  }
}

controller.getVoteList = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.params
  const { pageNum, limit, index, search } = req.query
  let npageNum = Number(pageNum) || 1  // NOTE: 쿼리스트링으로 받을 페이지 번호 값, 기본값은 1
  const contentSize = 10 // NOTE: 페이지에서 보여줄 컨텐츠 수.
  let nlimit = Number(limit) || 10
  let query = ""

  const skipSize = (npageNum - 1) * contentSize // NOTE: 다음 페이지 갈 때 건너뛸 

  try {
    if (search != undefined) {
      query = `AND (username LIKE ('%${search}') OR phone LIKE('%${search}') OR birthday LIKE ('%${search}'))`
    }
    console.log(query)

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

    await connection.commit()
    connection.release()
    return res.json(Results.onSuccess({ id: electionlist }))
  } catch (error) {
    await connection.rollback()
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

    await connection.commit()
    connection.release()
    return res.json(Results.onSuccess({ id: electionlist }))
  } catch (error) {
    await connection.rollback()
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
  }
}


controller.getElectionCounting = async (req, res, next) => {
  const { id } = req.decoded
  // const {  } = req.params

  try {
    const [data] = await pool.query('SELECT election.id, election.name,  COUNT(ballot.election_id) AS total , COUNT(IF(ballot.flag=1, 1, NULL)) AS COUNT  FROM election LEFT JOIN ballot ON election.id = ballot.`election_id` WHERE election.flag = 2 AND election.admin_id = ? GROUP BY election.id ORDER BY election.id ', [id])

    if (data.length == 0) return res.json(Results.onFailure("완료된 선거가 없습니다"))
    return res.json(Results.onSuccess(data))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
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
    return res.json(Results.onFailure("ERROR"))
  }
}

controller.setElectionGroupCounting = async (req, res, next) => {
  const { id } = req.decoded
  const { election } = req.body
  console.log(election)
  const electionlist = election.split(',')
  try {

    const [ballot] = await pool.query(`
      SELECT election.id, election.name, COUNT(ballot.election_id) AS total , COUNT(IF(ballot.flag=1, 1, NULL)) AS COUNT  FROM 
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
    return res.json(Results.onFailure("ERROR"))
  }
}


controller.getVoteResult = async (req, res, next) => {
  const { id } = req.decoded
  const { start, end } = req.query
  try {
    let query = `SELECT election.id, election.name, election.start_dt, election.end_dt, election.noption, COUNT(*) AS total, COUNT(IF(voter.flag=1, 1, NULL)) AS count
    FROM election, voter
     WHERE election.voteflag=1 AND election.flag = 2 AND  election.id = voter.election_id AND election.admin_id = ${id} 
    GROUP BY election.id, election.name, election.start_dt, election.end_dt, election.noption  ORDER BY election.id desc `

    if (start != 'null' && end != 'null') {
      query = `SELECT election.id, election.name, election.start_dt, election.end_dt, election.noption, COUNT(*) AS total, COUNT(IF(voter.flag=1, 1, NULL)) AS count
      FROM election, voter
       WHERE election.voteflag=1 AND election.flag = 2 AND  election.id = voter.election_id AND election.admin_id = ${id} AND DATE(election.end_dt) BETWEEN '${start}' AND '${end}'
      GROUP BY election.id, election.name, election.start_dt, election.end_dt, election.noption  ORDER BY election.id desc   `
    }
    // console.log(query)
    const [eleciton] = await pool.query(query, [])
    if (eleciton.length == 0) return res.json(Results.onSuccess())
    const result = eleciton.map(async data => {
      let json = {}
      json = data
      let num = Math.floor((data.count / data.total) * 100)
      if (num === Infinity) num = 0
      json.rate = num
      const [vote] = await pool.query(`
      SELECT candidate.id, voter.username FROM voter, candidate WHERE voter.id = candidate.voter_id AND voter.election_id = ?
      `, [data.id])

      if (vote.length == 0) {
        json.data = []
        json.result = ""
        return json
      }
      let voteCount = vote.map(async data => {
        const [[ncount]] = await pool.query(`SELECT COUNT(*) AS count FROM vote_result WHERE candidate_id = ?`, [data.id])
        return { username: data.username, count: ncount.count }
      })

      let [[nullcount]] = await pool.query(`
      SELECT  COUNT(IF(IFNULL(candidate_id,0)=0, 1, NULL)) AS count FROM vote_result WHERE  election_id = ?
      `, [data.id])


      let count = await Promise.all(voteCount)

      count.push({ username: "기권", count: nullcount.count })

      const candidate = count.sort((a, b) => {
        return b["count"] - a["count"]
      })

      json.data = candidate

      if (data.noption == 0) {
        if (candidate[0].username == "기권") {
          json.result = "무효"
        }

      }
      else {
        console.log(candidate[0].username)
        if (candidate[0].username == "기권") {
          json.result = candidate[1].username
        }
        else {
          json.result = candidate[0].username
        }
      }
      return json
    })

    let resjson = await Promise.all(result)

    return res.json(Results.onSuccess(resjson))
  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
  }
}


controller.getVoteResultExcel = async (req, res, next) => {
  const { id } = req.decoded
  const { start, end } = req.query
  try {
    let query = `SELECT election.id, election.name, election.start_dt, election.end_dt, election.noption, COUNT(*) AS total, COUNT(IF(voter.flag=1, 1, NULL)) AS count
    FROM election, voter
     WHERE election.voteflag=1 AND election.flag = 2 AND  election.id = voter.election_id AND election.admin_id = ${id} 
    GROUP BY election.id, election.name, election.start_dt, election.end_dt, election.noption  ORDER BY election.id desc `

    if (start != 'null' && end != 'null') {
      query = `SELECT election.id, election.name, election.start_dt, election.end_dt, election.noption, COUNT(*) AS total, COUNT(IF(voter.flag=1, 1, NULL)) AS count
      FROM election, voter
       WHERE election.voteflag=1 AND election.flag = 2 AND  election.id = voter.election_id AND election.admin_id = ${id} AND DATE(election.end_dt) BETWEEN '${start}' AND '${end}'
      GROUP BY election.id, election.name, election.start_dt, election.end_dt, election.noption  ORDER BY election.id desc `
    }
    // console.log(query)
    const [eleciton] = await pool.query(query, [])



    let candidate_list = []
    const result = eleciton.map(async data => {
      let json = {}
      json.선거명 = data.name
      let num = Math.floor((data.count / data.total) * 100)
      if (num === Infinity) num = 0
      json.투표율 = num
      json.유권자 = data.total
      json.투표자 = data.count

      const [vote] = await pool.query(`
      SELECT candidate.id, voter.username FROM voter, candidate WHERE voter.id = candidate.voter_id AND voter.election_id = ?
      `, [data.id])

      if (vote.length == 0) {
        candidate_list.push([])
        return json
      }
      let voteCount = vote.map(async data => {
        const [[ncount]] = await pool.query(`SELECT COUNT(*) AS count FROM vote_result WHERE candidate_id = ?`, [data.id])
        return { "이름": data.username, "투표수": ncount.count }
      })

      let [[nullcount]] = await pool.query(`
      SELECT  COUNT(IF(IFNULL(candidate_id,0)=0, 1, NULL)) AS count FROM vote_result WHERE  election_id = ?
      `, [data.id])


      let count = await Promise.all(voteCount)

      count.push({ "이름": "기권", "투표수": nullcount.count })

      const candidate = count.sort((a, b) => {
        return b["투표수"] - a["투표수"]
      })

      candidate_list.push(candidate)

      if (data.noption == 0) {
        if (candidate[0].이름 == "기권") {
          json.당선자 = "무효"
        }

      }
      else {
        console.log(candidate[0].이름)
        if (candidate[0].이름 == "기권") {
          json.당선자 = candidate[1].이름
        }
        else {
          json.당선자 = candidate[0].이름
        }
      }
      return json
    })

    let resjosn = await Promise.all(result)

    let ws_name = '총합';
    let book = xlsx.utils.book_new();
    let ws = xlsx.utils.json_to_sheet(resjosn);
    xlsx.utils.book_append_sheet(book, ws, ws_name);

    for (let data1 in resjosn) {
      ws_name = resjosn[data1].선거명
      console.log(resjosn[data1].선거명)
      ws = xlsx.utils.json_to_sheet(candidate_list[data1]);
      xlsx.utils.book_append_sheet(book, ws, ws_name);
    }

    var buf = xlsx.write(book, { type: 'buffer', bookType: "xlsx" });
    res.setHeader('Content-Disposition', 'attachment; filename="reuslt.xlsx');
    return res.send(buf)

  } catch (error) {
    logger.error(error.stack)
    return res.json(Results.onFailure("ERROR"))
  }
}

module.exports = controller;