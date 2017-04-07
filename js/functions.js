'use strict';

var fs = require('fs');
var request = require('request');
var http = require("http");
var sharp = require('sharp');
var Hubfs = require('hubfs.js')
var toTitleCase = require('titlecase')
var yamljs = require("yamljs")

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

exports.readItemFromGithub = function(fn) {
  var gh = Hubfs(GHOptions)
  // item known to have yaml fm
  // and content in markdown format
  return new Promise((resolve, reject) => {
    gh.readFile(fn, (err, data) => {
      if(err) {
        reject(err);
      } else {
        try {
          resolve(util.parseItem(data));
        } catch(err) {
          reject(err);
        }
      }
    });
  });
}

/*
   writes file to github
*/
exports.writeFileToGithub = function(fileToSend,locationInGit) {
   if (process.env.NODE_ENV=='development'){
      console.log("Sending to:\n"+locationInGit);
      console.log("Sending data:\n"+fileToSend);
      return true;
   } else {
      var gh = Hubfs(GHOptions)
      fs.readFile(fileToSend, function (err,data) {
        if (err) {
          return console.log(err);
        }
        gh.writeFile(locationInGit, data, function (err) {
        if (err) throw err
        //console.log('It\'s saved!')
        return true;
        })
      });
   }
}

/*
   writes data to github
*/
exports.writeDataToGithub = function(dataToSend, locationInGit, callback) {
   if (process.env.NODE_ENV=='development'){
      console.log("Sending to:\n"+locationInGit);
      console.log("Sending data:\n"+dataToSend);
      return true;
   } else {
      var gh = Hubfs(GHOptions);
      // token auth
      gh.writeFile(locationInGit, dataToSend, callback);
   }
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
exports.SaveImagesToGitHub = function(image_url,filename,locationInGit) {
   var sharp = require('sharp');
   var tmp = require('tmp');
   tmp.file({ mode: parseInt('0644',8), prefix: 'openatimg-', postfix: '.jpg' },function _tempFileCreated(err, path, fd) {
     if (err) throw err;
     exports.download(image_url,path, function() {
      var imaget = sharp(path)
         .resize(250, 250)
         .png()
         .toFile('./tmp/download_image/' +filename+'-thumb.png', function(err) {
            });

      var imagel = sharp(path)
         .resize(500, 500)
         .png()
         .toFile('./tmp/download_image/' +filename+'.png', function(err) {
            });
      });
   });
   //Now write to Github - NB - NOT ASYNC. QUICK FIX
   if (fs.existsSync('./tmp/download_image/' +filename+'-thumb.png')) {
      exports.writeFileToGithub('./tmp/download_image/' +filename+'-thumb.png',locationInGit+filename+'-thumb.png');
   }

   if (fs.existsSync('./tmp/download_image/' +filename+'.png')) {
      exports.writeFileToGithub('./tmp/download_image/' +filename+'.png',locationInGit+filename+'.png');
   }
};
