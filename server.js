var express = require('express')
  , cors = require('cors')
  , app = express()
  , bodyParser = require('body-parser')
  , path = require('path');

// include datejs
require('datejs')

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('port', (process.env.PORT || 5000));
app.use('/docs/v1/', express.static(path.join(__dirname, 'docs'), {
  //maxAge: 31557600000
}));

if (!process.env.GitHubOAuth){
   console.error('No GitHubOAuth env var set! Now quitting');
   return null;
}

// Init stuff - this will eventually get removed once we move to the whole github pulling and updating 
var mkdirp = require('mkdirp');

mkdirp('./tmp/download_image', function (err) {
    if (err) console.error(err)
});

mkdirp('./tmp/output', function (err) {
    if (err) console.error(err)
});


require('./routes')(app, cors);

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
exports = module.exports = app;
