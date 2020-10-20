var express = require('express');
var controller = require("./controller");

var router = express.Router();

/* GET users listing. */
router.get('/', controller.getTest);

router.post('/login', controller.getUserLogin)
router.get('/list', controller.isLoginCheck, controller.getElectionList)

router.get('/:election/list', controller.isLoginCheck, controller.getCandidateList)
router.post('/:election/list', controller.isLoginCheck, controller.setCandidateList)


module.exports = router;