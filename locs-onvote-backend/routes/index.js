var express = require('express');

var user = require("./users");

var router = express.Router();

router.use('/users', user);


module.exports = router;
