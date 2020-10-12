
var express = require('express');
var controller = require("./controller");

var router = express.Router();
/* GET users listing. */
router.get('/', controller.getTest);
router.get('/login', controller.getAdminLogin);
router.post('/login', controller.getAdminLogin);

router.post('/option', controller.isLoginCheck, controller.putAdminOption);


module.exports = router;