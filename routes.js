/**
 * Main application routes
 */

'use strict';

module.exports = function(app) {

    // Insert routes
    app.use('/add/pinshape', require('./js/pinshape'));
    app.use('/add/github', require('./js/github'));
    app.use('/add/instructables', require('./js/instructables'));
    app.use('/add/thingiverse', require('./js/thingiverse'));
    app.use('/add/sourceforge', require('./js/sourceforge'));
    app.use('/save', require('./js/savejson'));
    app.route('/*')
        .get(function(req, res) {
            res.json({ error: "Sorry, this site is not supported" });
        });
};