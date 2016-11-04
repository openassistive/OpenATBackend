'use strict';

var express = require('express');
var controller = require('./git.controller');
var cmdProc = require('./runCommand');
//var automater = require('./repo_auto/automater');
var router = express.Router();
router.get('/clone', controller.cloneGit);
router.get('/push', controller.pushGit2);
router.get('/simplegit', controller.simpleGit);
//router.use('/automater', automater.update_file);
router.use('/commnadProc', cmdProc.runCommands);
module.exports = router;