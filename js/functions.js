'use strict';

var fs = require('fs');
var request = require('request');
var http = require("http");
var sharp = require('sharp');
var Hubfs = require('hubfs.js')
var toTitleCase = require('titlecase')
var yamljs = require("yamljs")
const Octokat = require('octokat')
const _ = require('lodash')

const util = require('./util')

var GHOptions = {
  owner: 'openassistive',
  repo: 'OpenATFrontEnd',
  auth: {
   token: process.env.GitHubOAuth
  }
}

/* generate a shortTitle */
exports.genShortTitle = function(strLongTitle) {
   var short_title = toTitleCase(strLongTitle.trim());
   //Now get Rid of spaces
   short_title = short_title.replace(' ','');
   // Lastly ditch any non-Word chars
   // \W is any non-word char (e.g. ! a-ZA-X0-9_
   var rexp = /([\W]+)/ig;
   short_title = short_title.replace(rexp, '');
   return short_title;
};

exports.readFromGithub = function(fn) {
  var gh = Hubfs(GHOptions)
  // item known to have yaml fm
  // and content in markdown format
  return new Promise((resolve, reject) => {
    gh.readFile(fn, (err, data) => {
      if(err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}

exports.readItemFromGithub = function(fn) {
  return exports.readFromGithub(fn)
    .then((data) => {
        try {
          return util.parseItem(data.toString('utf8'));
        } catch(err) {
          throw err;
        }
    });
}

let itemChangeQueuePromise = Promise.resolve();

/** @brief queue to perform changes on item
 * This is necessary for performing a change to items at a time
 * if it needs modifying `items_index.csv` queueing it is necessary
 * @param callback is trigger when green light is on for it, 
 *        It should return a promise on finish
 * @return promise at callback finish
 */
exports.itemChangeQueue = function(callback) {
  return itemChangeQueuePromise = itemChangeQueuePromise
    .then(() => callback());
}

let nextCommitPromise = Promise.resolve();

/** @brief commit changes to frontend github
 * @param branch the branch to work on
 * @param message of the commit
 * @param changes is a list of blob files to change
 * @return promise at completion
 */
exports.commitChangesToGithub = function(branch, message, changes) {
  let repo = new Octokat(GHOptions.auth).repos(GHOptions.owner,GHOptions.repo);

  // stage one <upload>
  return Promise.all(changes.map((change, index) => {
    // for streams...
    // blobs can get posted in raw format "application/vnd.github.VERSION.raw"
    // it helps for performing pipe on input streams
    // apparently octokat does not support it, I'll simply it by downgrading
    // back to buffered data
    // TODO:: upgrade stream upload to save memory
    if(change.stream) {
      // no encoding for streams
      return new Promise((resolve, reject) => {
        var bufs = [],
            cancel = false;
        change.stream.on('error', (err) => {
          cancel = true; 
          reject(err)
        });
        change.stream.on('data', (d) => bufs.push(d));
        change.stream.on('end', () => {
          if(cancel)
            return;
          var buf = Buffer.concat(bufs);
          repo.git.blobs.create({ content: buf.toString('base64'),
                                  encoding: 'base64' })
            .then(resolve, reject);
        });
      });
    } else {
      let blob = _.fromPairs(
        [ 'content', 'encoding' ].map((f) => {
          if(!change[f])
            throw new Error(`change[${index}] needs ${f}`)
          return [ f, change[f] ]
        })
      );
      return repo.git.blobs.create(blob);
    }
  }))
    .catch(util.catchCheckpoint())
    .then((results) => {
      // stage two commit
      return nextCommitPromise = nextCommitPromise
        .catch((err) => null) // catch -> then
        .then(() => {
          return repo.git.refs.heads(branch).fetch()
            .catch(util.catchCheckpoint())
            .then((ref) => {
              if(ref.object.type != 'commit')
                throw new Error(`branch '${branch}' has unexpected ` +
                                `ref to ${ref.object.type}`);
              return repo.git.commits(ref.object.sha).fetch()
                .catch(util.catchCheckpoint())
                .then((commit) => {
                  // add the tree
                  return repo.git.trees.create({
                    base_tree: commit.tree.sha,
                    tree: results.map((blobRes, index) => {
                      let change = changes[index];
                      return Object.assign(
                        {
                          sha: blobRes.sha,
                          mode: '100644',
                          type: 'blob'
                        },
                        _.fromPairs(
                          [ 'mode', 'path' ]
                            .map((f) => [ f, change[f] ])
                            .filter((v) => !!v[1])
                        )
                      );
                    })
                  });
                })
                .catch(util.catchCheckpoint())
                .then((tree) => {
                  // create commit
                  return repo.git.commits.create({
                    message,
                    tree: tree.sha,
                    parents: [ ref.object.sha ]
                  });
                  repo.git.refs.heads(branch).fetch()
                })
                .catch(util.catchCheckpoint())
                .then((newcommit) => {
                  // update branch ref
                  return repo.git.refs.heads(branch)
                    .update({ sha: newcommit.sha });
                })
                .catch(util.catchCheckpoint());
            });
        });
    });
}

/** @brief default options for downloadFileToBuffer
 */
exports.downloadFileToBufferDefaultOptions = {
  limit: 2 * 1024 * 1024, // 2MiB
};

/** @brief download a file from net, return the content as buffer
 * @param url of file
 * @param [options] currently has limit
 * @return promise of content buffer
 */
exports.downloadFileToBuffer = function(url, options) {
  if(url == null)
    throw new Error("url should be a valid value");
  if(options === undefined)
    options = exports.downloadFileToBufferDefaultOptions;
  return new Promise((resolve, reject) => {
    request.head(url, function(err, resp, body) {
      if(err)
        return reject(err);
      var contentLength = parseInt(resp.headers['content-length']);
      if(isNaN(contentLength) || contentLength > options.limit) {
        reject(new Error(`Invalid file size ${contentLength}`));
      } else {
        request({ url: url, encoding: null }, function(err, resp, body) {
          if(err)
            return reject(err);
          resolve(body);
        });
      }
    });
  });
}

/** @brief creates images for an item from input data
 * @param data input data
 * @return promise of a dict with images data
 */
exports.createItemImages = function(data) {
  return Promise.all([
    new Promise((resolve, reject) => {
      sharp(data)
        .resize(150)
        .min() // ensure that image width is atleast 150px or the size of image
        .png()
        .toBuffer(function (err, outputBuffer, info) {
          // info.width and info.height contain the dimensions of the resized image
          if(err)
            reject(err);
          else
            resolve(outputBuffer);
        });
    }),
    new Promise((resolve, reject) => {
      sharp(data)
        .resize(500)
        .max() // ensure that image width is atmost 500px or the size of image
        .png()
        .toBuffer(function (err, outputBuffer, info) {
          // info.width and info.height contain the dimensions of the resized image
          if(err)
            reject(err);
          else
            resolve(outputBuffer);
        });
    })
  ]).then((out) => {
    return {
      thumb: out[0],
      image: out[1]
    };
  });
}



exports.cloneObj = function(obj) {
       if (null == obj || "object" != typeof obj) return obj;
       var copy = obj.constructor();
       for (var attr in obj) {
           if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
       }
       return copy;
   }

exports.generateMDFile = function(json) {
    var obj = exports.cloneObj(json);
    // messy way of doing things but couldnt figure out a better way
    delete obj['main_description'];
    var content = '---\n';    
    content += yamljs.stringify(obj, 4);
    content += '---\n';
    if (json.main_description != undefined && json.main_description != "") {
        content += json.main_description;
    }
    return content;
};

exports.download = function(uri, filename, callback) {
    request.head(uri, function(err, res, body) {
        var req = request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};


