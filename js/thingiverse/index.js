'use strict';

var express = require('express');
var controller = require('./thingiverse.controller');

var router = express.Router();
router.get('/:url0', controller.scrape_Thingiverse);
router.get('/:url0/:url1', controller.scrape_Thingiverse);
router.get('/:url0/:url1/:url2', controller.scrape_Thingiverse);
router.get('/:url0/:url1/:url2/:url3', controller.scrape_Thingiverse);
router.get('/:url0/:url1/:url2/:url3/:url4', controller.scrape_Thingiverse);
router.get('/:url0/:url1/:url2/:url3/:url4/:url5', controller.scrape_Thingiverse);
module.exports = router;