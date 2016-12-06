var Router = require('express').Router;

module.exports.allServices = [
  {
    name: 'github'
  },
  {
    name: 'instructables'
  },
  {
    name: 'pinshape'
  },
  {
    name: 'sourceforge'
  },
  {
    name: 'thingiverse'
  }
];

var createServiceRouter = function(service) {
  var router = new Router();
  var handler = require('./' + service.name);
  router.get(/\/(.+)/, handler);
  return router;
};

module.exports.getRouters = function(app) {
  return exports.allServices.map(function(service) {
    return {
      name: service.name,
      router: createServiceRouter(service.name)
    }
  });
};
