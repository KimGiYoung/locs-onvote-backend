var express = require('express');
var controller = require("./controller");

var router = express.Router();

/* GET users listing. */
router.get('/', controller.getTest);


module.exports = router;