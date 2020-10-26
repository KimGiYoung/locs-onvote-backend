var express = require('express');
var controller = require("./controller");
var admin = require("../admin/controller");
var router = express.Router();

/* GET users listing. */
router.get('/', controller.getTest);
router.get('/:election/ballot', admin.isLoginCheck, controller.getballotList)           // 개표확인자 리스트 조회
router.post('/:election/ballot', admin.isLoginCheck, controller.setballotList)          // 개표확인자 추가
router.delete('/:election/ballot/:ballot', admin.isLoginCheck, controller.deleteballotList)    // 개표확인자 삭제
router.get('/:election/ballot/:ballot', admin.isLoginCheck, controller.getDetailballot)    // 개표확인자 

router.get('/ballot/list', admin.isLoginCheck, controller.getElectionCounting)



// router.post('/:election/result', admin.isLoginCheck, controller.setElectionCounting)          // 개별 개표
router.post('/election/result', admin.isLoginCheck, controller.setElectionGroupCounting)          // 개별 개표



router.get('/list', admin.isLoginCheck, controller.getElectionList) // 선거 진행리스트 

router.get('/:election/list', admin.isLoginCheck, controller.getVoteList)           // 투표 현황


router.put('/invalid', admin.isLoginCheck, controller.putElectionInvalid)          // 투표 무효
router.put('/date', admin.isLoginCheck, controller.putElectionAddDate)          // 투표 연장



router.get('/result', admin.isLoginCheck, controller.getVoteResult)             // 개표 결과
router.get('/download', admin.isLoginCheck, controller.getVoteResultExcel)             // 개표 결과 다운로드

module.exports = router;