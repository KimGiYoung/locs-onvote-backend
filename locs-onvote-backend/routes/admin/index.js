
var express = require('express');
var controller = require("./controller");

var router = express.Router();
/* GET users listing. */
router.get('/', controller.getTest2);
router.get('/test', controller.getTest3);
router.get('/login', controller.getAdminLogin);
router.post('/login', controller.getAdminLogin);

router.post('/option', controller.isLoginCheck, controller.putAdminOption);
router.get('/token', controller.istokenCheck, controller.TokenReissue)


module.exports = router;