var express = require('express');
var app = express();

require('./routes')(app);
app.listen('8081')
console.log('Magic happens on port 8081');
exports = module.exports = app;