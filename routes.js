/**
 * Main application routes
 */

'use strict';

module.exports = function(app) {

    // Insert routes
    app.use('/add/:tags/pinshape', require('./js/pinshape'));
    app.use('/add/:tags/github', require('./js/github'));
    app.use('/add/:tags/instructables', require('./js/instructables'));
    app.use('/add/:tags/thingiverse', require('./js/thingiverse'));
    app.use('/add/:tags/sourceforge', require('./js/sourceforge'));
    // app.use('/git', require('./js/git'));
    // All other routes should redirect to the index.html
    app.route('/*')
        .get(function(req, res) {
            res.send({ error: "Sorry, this site is not supported" });
        });
};