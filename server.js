
// include datejs
require('datejs')

if (!process.env.GitHubOAuth){
  console.error('No GitHubOAuth env var set! Now quitting');
  process.exit(-1);
}

if (!process.env.RecaptchaSecret){
  console.error('No RecaptchaSecret env var set! Now quitting');
  process.exit(-1);
}

var express = require('express')
  , cors = require('cors')
  , app = express()
  , bodyParser = require('body-parser')
  , path = require('path');

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.set('port', (process.env.PORT || 5000));
app.use('/docs/v1/', express.static(path.join(__dirname, 'docs'), {
  //maxAge: 31557600000
}));

require('./routes')(app, cors);

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
exports = module.exports = app;
