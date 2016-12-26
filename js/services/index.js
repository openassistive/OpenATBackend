'use strict';

var url = require('url');
var Router = require('express').Router;

var allServices = module.exports.allServices = [
  {
    name: 'github',
    baseUrl: 'http://www.github.com/',
    projectPath: {
      skip: 0,
      take: 2
    }
  },
  {
    name: 'instructables',
    baseUrl: 'http://www.instructables.com/',
    projectPath: {
      skip: 0,
      take: 2
    }
  },
  {
    name: 'pinshape',
    baseUrl: 'http://www.pinshape.com/',
    projectPath: {
      skip: 0,
      take: 2
    }
  },
  {
    name: 'sourceforge',
    baseUrl: 'http://www.sourceforge.com/',
    projectPath: {
      skip: 0,
      take: 1
    }
  },
  {
    name: 'thingiverse',
    baseUrl: 'http://www.thingiverse.com/',
    projectPath: {
      skip: 0,
      take: 1
    }
  }
];

var getProjectUrl = function(service, path) {
  var resolved = url.resolve(service.baseUrl, path);
  var parsed = url.parse(resolved);

  var pathname = parsed
    .path
    .split('/')
    .slice(service.projectPath.skip+1, service.projectPath.take+1)
    .join('/');

  return url.resolve(service.baseUrl, pathname);
};

var createServiceRouter = function(service) {
  var router = new Router();
  var handler = require('./' + service.name).handler;

  router.get('/', function(req, res, next) {
    req.projectUrl = getProjectUrl(service, req.query.path);
    req.repoPath = url.parse(req.projectUrl).pathname;
    handler(req, res, next);
  });

  return router;
};

module.exports.getRouters = function(app) {
  return allServices.map(function(service) {
    return {
      name: service.name,
      router: createServiceRouter(service)
    }
  });
};
