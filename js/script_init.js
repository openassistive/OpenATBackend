
// include datejs
require('datejs')

if (!process.env.GitHubOAuth){
  console.error('No GitHubOAuth env var set! Now quitting');
  process.exit(-1);
}

// Init stuff - this will eventually get removed once we move to the whole github pulling and updating 
var mkdirp = require('mkdirp');

mkdirp('./tmp/download_image', function (err) {
    if (err) console.error(err)
});

mkdirp('./tmp/output', function (err) {
    if (err) console.error(err)
});
