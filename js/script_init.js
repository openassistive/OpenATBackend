
// include datejs
require('datejs')

// required env variables
let _vars = ['GitHubOAuth']//, 'AlgoliaAppID', 'AlgoliaAPIKey', 'OpenATIndexName']
_vars.forEach((name) => {
  if (!process.env[name]){
    console.error(`No ${name} env var set! Now quitting`);
    process.exit(-1);
  }
});

// Init stuff - this will eventually get removed once we move to the whole github pulling and updating 
var mkdirp = require('mkdirp');

mkdirp('./tmp/download_image', function (err) {
    if (err) console.error(err)
});

mkdirp('./tmp/output', function (err) {
    if (err) console.error(err)
});
