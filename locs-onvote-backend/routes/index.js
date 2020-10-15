var express = require('express');
var router = express.Router();

var user = require("./users");
var admin = require("./admin");
var election = require("./election");
var vote = require("./vote");


router.use('/users', user);
router.use('/admin', admin);
router.use('/election', election);
router.use('/vote', vote);


module.exports = router;
