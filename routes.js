/**
 * Main application routes
 */

'use strict';

module.exports = function(app, cors) {

   // to allow cors for set domains use the following..
    var whitelist = ['http://example1.com', 'http://example2.com'];
    var corsOptions = {
      origin: function(origin, callback){
         var originIsWhitelisted = whitelist.indexOf(origin) !== -1;
         callback(originIsWhitelisted ? null : 'Bad Request', originIsWhitelisted);
      }
    };
    // and change the route e.g.
    //app.use('/add/pinshape', cors(corsOptions), require('./js/pinshape'));
    
    // Insert routes
    app.use('/add/pinshape', cors(), require('./js/pinshape'));
    app.use('/add/github', cors(), require('./js/github'));
    app.use('/add/instructables', cors(), require('./js/instructables'));
    app.use('/add/thingiverse', cors(), require('./js/thingiverse'));
    app.use('/add/sourceforge', cors(), require('./js/sourceforge'));
    app.use('/save', cors(), require('./js/savejson'));
    app.route('/*')
        .get(function(req, res) {
            res.json({ error: "Sorry, this site is not supported" });
        });
};