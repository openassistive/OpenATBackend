'use strict';

var express = require('express');
var controller = require('./savejson.controller');
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json()

var router = express.Router();

router.post('/', jsonParser, controller.saveJSON);
module.exports = router;
