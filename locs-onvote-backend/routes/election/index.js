var express = require('express');
var controller = require("./controller");
var admin = require("../admin/controller");
var multer = require('multer')
var fs = require('fs')
var path = require('path')
const logger = require("../../config/logger");
let memory = multer({
    storage: multer.memoryStorage(),
    // dest: './uploads/'
});

const storage = multer.diskStorage({
    destination(req, file, callback) {
        fs.mkdir("uploads/", (err) => {
            if (err) {
                callback(null, "uploads/")
            }
            else {
                callback(null, "uploads/")
            }
        }
        )

    },
    filename(req, file, callback) {
        try {

            const extension = path.extname(file.originalname);
            const basename = path.basename(file.originalname, extension);

            callback(null, basename + "-" + Date.now() + extension);
        }
        catch (e) {
            logger.info(e)
        }
    }
});


let upload = multer({
    // storage: multer.memoryStorage(),
    storage
});

var router = express.Router();

/* GET users listing. */
router.get('/', controller.getTest);
router.get('/list', admin.isLoginCheck, controller.getElectionList);    // 선거 리스트
router.post('/list', admin.isLoginCheck, controller.setElectionList);   // 선거 추가
router.get('/short', admin.isLoginCheck, controller.getElectionShortList);  // 선거 간략한 정보 리스트

router.get('/:election', admin.isLoginCheck, controller.getElection);   // 선거 세부정보
router.post('/:election', memory.array('file', 1), admin.isLoginCheck, controller.setVoterAdd);   // 선거 명부 등록(선거 추가랑 합칠예정)

router.get('/:election/candidate', admin.isLoginCheck, controller.getCandidate);         // 후보자 조회
router.post('/:election/candidate', upload.fields([{ name: 'img', maxCount: 1 }, { name: 'pdf', maxCount: 1 }]), admin.isLoginCheck, controller.setCandidate);        // 후보자 등록(예정)


router.get('/:election/candidate/list', admin.isLoginCheck, controller.getCandidateList);         // 후보자 검색 리스트


module.exports = router;