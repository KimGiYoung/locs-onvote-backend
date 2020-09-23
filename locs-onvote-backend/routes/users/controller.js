const { ConsoleTransportOptions } = require("winston/lib/winston/transports");
const pool = require("../../database");

class Authorization {
  async getTest(req, res, next) {
    const data = await pool.query('select * from user')
    return res.json(data)
  }
}

module.exports = Authorization;