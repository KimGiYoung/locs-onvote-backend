var express = require('express');
var router = express.Router();

var user = require("./users");
var admin = require("./admin");
var election = require("./election");
var vote = require("./vote");
var ballot = require('./ballot');

router.use('/users', user);
router.use('/admin', admin);
router.use('/election', election);
router.use('/vote', vote);
router.use('/ballot', ballot);


module.exports = router;
