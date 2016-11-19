/**
 * Main application routes
 */

'use strict';

module.exports = function(app, cors) {

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