/**
 * Main application routes
 */

'use strict';
var path = require('path');
var url = require('url');
var Router = require('express').Router;
var services = require('./js/services');

var setupApi = function(app, cors) {
  var api = new Router();
  services.getRouters().forEach(function(service) {
    api.use('/' + service.name + '/project', service.router);
  });
  app.use('/v1/service', cors(), api);
  app.use('/v1/project/save', require('./js/savejson'));
};

var setupDocs = function(app) {
  app.get('/docs/v1/', function(req, res) {
    res.sendFile(path.join(__dirname, 'docs', 'index-2.html'));
  });
};

module.exports = function(app, cors) {
  // to allow cors for set domains use the following..
  var whitelist = ['http://example1.com', 'http://example2.com'];
  var corsOptions = {
    origin: function(origin, callback){
      var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
      callback(originIsWhitelisted ? null : 'Bad Request', originIsWhitelisted);
    }
  };

  setupDocs(app);
  setupApi(app, cors);

  app.route('/*').get(function(req, res) {
    res.json({ error: "Sorry, this site is not supported" });
  });
};
