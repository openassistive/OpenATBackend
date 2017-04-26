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
    let blob = _.fromPairs(
      [ 'content', 'encoding' ].map((f) => {
        if(!change[f])
          throw new Error(`change[${index}] needs ${f}`)
        return [ f, change[f] ]
      })
    );
    return repo.git.blobs.create(blob);
  }))
    .then((results) => {
      // stage two commit
      return nextCommitPromise = nextCommitPromise
        .then(() => {
          return repo.git.refs.heads(branch).fetch()
            .then((ref) => {
              if(ref.object.type != 'commit')
                throw new Error(`branch '${branch}' has unexpected ` +
                                `ref to ${ref.object.type}`);
              return repo.git.commits.fetch({ sha: ref.object.sha })
                .then((commit) => {
                  console.log("commit", commit);
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
                .then((tree) => {
                  // create commit
                  return repo.git.commits.create({
                    message,
                    tree: tree.sha,
                    parents: [ ref.object.sha ]
                  });
                  repo.git.refs.heads(branch).fetch()
                })
                .then((newcommit) => {
                  // update branch ref
                  return repo.git.refs.heads(branch)
                    .update({ sha: newcommit.sha });
                });
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
  var sharp = require('sharp');
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

/** @deprecated
   writes file to github
*/
exports.writeFileToGithub = function(fileToSend,locationInGit) {
  return new Promise((resolve, reject) => {
    if (process.env.NODE_ENV=='development'){
      console.log("Sending to:\n"+locationInGit);
      console.log("Sending data:\n"+fileToSend);
      resolve();
      return true;
    } else {
      var gh = Hubfs(GHOptions)
      fs.readFile(fileToSend, function (err,data) {
        if (err) {
          reject(err);
          return console.log(err);
        }
        gh.writeFile(locationInGit, data, function (err) {
          if (err)
            reject(err);
          else
            resolve();
          //console.log('It\'s saved!')
          return true;
        })
      });
    }
  });
}

/** @deprecated
   writes data to github
*/
exports.writeDataToGithub = function(dataToSend, locationInGit) {
  return new Promise((resolve, reject) => {
    if (process.env.NODE_ENV=='development'){
      console.log("Sending to:\n"+locationInGit);
      console.log("Sending data:\n"+dataToSend);
      resolve();
      return true;
    } else {
      var gh = Hubfs(GHOptions);
      // token auth
      gh.writeFile(locationInGit, dataToSend, function(err) {
        if(err)
          reject(err);
        else
          resolve();
      });
    }
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

/** @deprecated
 */
exports.SaveImages = function(image_url,filename) {
   var sharp = require('sharp');
   var tmp = require('tmp');
   tmp.file({ mode: parseInt('0644',8), prefix: 'openatimg-', postfix: '.jpg' },function _tempFileCreated(err, path, fd) {
     if (err) throw err;
     exports.download(image_url,path, function() {
               var imaget = sharp(path)
                 .resize(250, 250)
                 .png()
                 .toFile(filename+'-thumb.png', function(err) {
                 });

                var imagel = sharp(path)
                 .resize(500, 500)
                 .png()
                 .toFile(filename+'.png', function(err) {
                 });

              });
   });
};
/** @deprecated
 */
exports.SaveImagesToGitHub = function(image_url,filename,locationInGit) {
  return new Promise((resolve, reject) => {
    var sharp = require('sharp');
    var tmp = require('tmp');
    tmp.file({ mode: parseInt('0644',8), prefix: 'openatimg-', postfix: '.jpg' },function _tempFileCreated(err, path, fd) {
      if (err) throw err;
      exports.download(image_url,path, function() {
        var promises = [], dest_thumb, dest_image;
        Promise.all([
          new Promise((resolve, reject) => {
            sharp(path)
              .resize(150)
              .min() // ensure that image width is atleast 150px or the size of image
              .png()
              .toBuffer(function (err, outputBuffer, info) {
                // info.width and info.height contain the dimensions of the resized image
                if(err)
                  reject(err);
                else {
                  dest_thumb = filename+'-thumb.png';
                  exports.writeDataToGithub(outputBuffer, locationInGit+dest_thumb)
                    .then(resolve, reject);
                }      
              });
          }),
          new Promise((resolve, reject) => {
            sharp(path)
              .resize(500)
              .max() // ensure that image width is atmost 500px or the size of image
              .png()
              .toBuffer(function (err, outputBuffer, info) {
                // info.width and info.height contain the dimensions of the resized image
                if(err)
                  reject(err);
                else {
                  dest_image = filename+'.png';
                  exports.writeDataToGithub(outputBuffer, locationInGit+dest_image)
                    .then(resolve, reject);
                }      
              });
          })
        ]).then(() => {
          resolve({
            thumb: dest_thumb,
            image: dest_image
          });
        }, reject);
      });
    });
  });
};
