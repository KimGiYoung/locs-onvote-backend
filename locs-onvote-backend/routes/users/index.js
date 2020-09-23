var express = require('express');
var Controller = require("./controller");

var router = express.Router();
const controller = new Controller()
/* GET users listing. */
router.get('/', controller.getTest);


module.exports = router;