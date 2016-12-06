/**
 * Main application routes
 */

'use strict';
var services = require('./js/services');

module.exports = function(app, cors) {

   // to allow cors for set domains use the following..
    var whitelist = ['http://example1.com', 'http://example2.com'];
    var corsOptions = {
      origin: function(origin, callback){
         var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
         callback(originIsWhitelisted ? null : 'Bad Request', originIsWhitelisted);
      }
    };

    services.getRouters().forEach(function(service) {
      app.use('/add/' + service.name, cors(), service.router);
    });

    app.use('/save', cors(), require('./js/savejson'));
    app.route('/*')
        .get(function(req, res) {
            res.json({ error: "Sorry, this site is not supported" });
        });
};
