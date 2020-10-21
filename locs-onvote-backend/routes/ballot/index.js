var express = require('express');
var controller = require("./controller");

var router = express.Router();

/* GET users listing. */
router.get('/', controller.getTest);

router.post('/login', controller.getBallotLogin)

router.get('/list', controller.isLoginCheck, controller.getBallotlist)
router.post('/list', controller.isLoginCheck, controller.setBallotlist)



module.exports = router;