var express = require('express')
  , cors = require('cors')
  , app = express();
app.use(cors());

var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
app.set('port', (process.env.PORT || 5000));

// Init stuff - this will eventually get removed once we move to the whole github pulling and updating 
var mkdirp = require('mkdirp');

mkdirp('download_image', function (err) {
    if (err) console.error(err)
    else console.log('Could not make download_image dir')
});

mkdirp('output', function (err) {
    if (err) console.error(err)
    else console.log('Could not make output dir')
});


// Routes

module.exports = function(app) {

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


// Main

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
exports = module.exports = app;