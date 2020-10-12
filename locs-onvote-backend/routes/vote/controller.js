const pool = require("../../database");

let controller = {}

controller.getTest = async (req, res, next) => {
  const data = await pool.query('select * from user limit 1')
  console.log(data[0])
  return res.json(data[0])
}


module.exports = controller;