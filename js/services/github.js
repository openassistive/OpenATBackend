'use strict';

var express = require('express');
var controller = require('./github.controller');

var router = express.Router();
router.get(/\/(.+)/, controller.scrape_Github);
module.exports = router;
