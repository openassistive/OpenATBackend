'use strict';

var url = require('url');
var Router = require('express').Router;
var contentCreator = require('../functions');
const items_index = require('../core/items_index')

var allServices = module.exports.allServices = [
  {
    name: 'github',
    baseUrl: 'http://www.github.com/',
    prefix: '',
    projectPath: {
      skip: 0,
      take: 2
    }
  },
  {
    name: 'instructables',
    baseUrl: 'http://www.instructables.com/',
    prefix: 'id/',
    projectPath: {
      skip: 0,
      take: 1
    }
  },
  {
    name: 'pinshape',
    baseUrl: 'http://www.pinshape.com/',
    prefix: 'items/',
    projectPath: {
      skip: 0,
      take: 1
    }
  },
  {
    name: 'sourceforge',
    baseUrl: 'http://www.sourceforge.com/',
    prefix: 'projects/',
    projectPath: {
      skip: 0,
      take: 1
    }
  },
  {
    name: 'thingiverse',
    baseUrl: 'http://www.thingiverse.com/',
    prefix: '',
    projectPath: {
      skip: 0,
      take: 1
    }
  },
  {
    name: 'httpfile' // input url is required
  },
  {
    name: 'dropbox',
    baseUrl: 'https://www.dropbox.com/',
    prefix: 'sh/',
    projectPath: {
      skip: 0 // take the rest
    }
  }
];

var getProjectUrl = function(service, path) {
  if(!service.baseUrl)
    throw new Error('url is required for this ')
  var resolved = url.resolve(service.baseUrl, path);
  var parsed = url.parse(resolved);

  var pathname = parsed
    .path
    .split('/')
    .slice(service.projectPath.skip+1,
           (service.projectPath.take!==undefined ? service.projectPath.take+1 :
            undefined))
    .map(encodeURIComponent)
    .join('/');

  return url.resolve(service.baseUrl, service.prefix + pathname);
};

function baseParamsMiddleWare(service, req, resp) {
  // insert base parameters in here
  // [ exists (ref #8) ]
  if(!req.result) // unexpected call
    return Promise.resolve();
  var promises = [];
  
  if(req.result.short_title) {
    promises.push(
      items_index.searchForItem(req.result)
        .then((found) => {
          if(found) {
            req.result.exists = true;
            // simple relative url
            req.result.current_url = "/item/" + found.short_title;
          } else {
            req.result.exists = false;
          }
        })
        .catch((err) => { // skip error
          console.error(err);
          req.result.exists = false;
        })
    );
  }
  return Promise.all(promises);
}

var returnHandler = function(req, res) {
  var service = this;
  baseParamsMiddleWare(service, req, res)
    .then(() => {
      if(req.accepts('text/json') || req.accepts('application/json')) {
        return res.json(req.result);
      }

      if(req.accepts('text/markdown') || req.accepts('application/markdown')) {
        res.set('Content-Type', 'text/markdown');
        return res.send(new Buffer(contentCreator.generateMDFile(req.result)));
      }

      res.json(req.result);
    });
};

var createServiceRouter = function(service) {
  var router = new Router();
  var handler = require('./' + service.name).handler;

  router.get('/', function(req, res) {
    if(req.query.url) { // url has priority
      req.projectUrl = req.query.url;
      req.projectUrlParsed = url.parse(req.projectUrl);
      if(['http:','https:'].indexOf(req.projectUrlParsed.protocol) == -1 ||
         !req.projectUrlParsed.host)
        return res.json({ error: 'invalid input url' });
    } else {
      if(!service.baseUrl)
        return res.json({ error: 'url is required for this service' });
      req.projectUrl = getProjectUrl(service, req.query.id);
      req.repoPath = url.parse(req.projectUrl).pathname;
    }
    handler(req, res, returnHandler.bind(service));
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
