var express = require('express');
var controller = require("./controller");
var admin = require("../admin/controller");
var multer = require('multer')
let memory = multer({
    storage: multer.memoryStorage(),
    // dest: './uploads/'
});
let upload = multer({
    // storage: multer.memoryStorage(),
    dest: './uploads/'
});

var router = express.Router();

/* GET users listing. */
router.get('/', controller.getTest);
router.get('/list', admin.isLoginCheck, controller.getElectionList);    // 선거 리스트
router.post('/list', admin.isLoginCheck, controller.setElectionList);   // 선거 추가
router.get('/short', admin.isLoginCheck, controller.getElectionShortList);  // 선거 간략한 정보 리스트

router.get('/:election', admin.isLoginCheck, controller.getElection);   // 선거 세부정보
router.post('/:election', memory.single('file'), admin.isLoginCheck, controller.setVoterAdd);   // 유권자 등록(선거 추가랑 합칠예정)

router.get('/:election/candidate', admin.isLoginCheck, controller.getCandidate);         // 후보자 조회
router.post('/:election/candidate', admin.isLoginCheck, controller.getElection);        // 후보자 등록(예정)


router.get('/:election/candidate/list', admin.isLoginCheck, controller.getCandidateList);         // 후보자 검색 리스트(예정)


module.exports = router;