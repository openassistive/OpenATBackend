'use strict';

var fs = require('fs');
var request = require('request');
var http = require("http");
var sharp = require('sharp');
var Hubfs = require('hubfs.js')
var toTitleCase = require('titlecase')

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

/*
   writes file to github
*/
exports.writeFileToGithub = function(fileToSend,locationInGit) {
   var gh = Hubfs(GHOptions)
   // token auth
   /*
   console.log(fileToSend)
   return null;
   */

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

/*
   writes data to github
*/
exports.writeDataToGithub = function(dataToSend, locationInGit, callback) {
  var gh = Hubfs(GHOptions);
   // token auth
   gh.writeFile(locationInGit, dataToSend, callback);
}



exports.generateMDFile = function(json) {
    var content = '---\n';
    //var obj = JSON.parse(json);
    var obj = json;
    var temp = "";
    for (var index in obj) {
        if (index != 'main_description') {
            temp += (index + ':' + obj[index] + '\n');
        }

    }
    content += temp + '\n' + '---\n';

    if (json.main_description != undefined && json.main_description != "") {
        content += json.main_description;
    }

    return content;
};


exports.createMDFile = function(json) {
    var content = '---\n';
    //var obj = JSON.parse(json);
    var obj = json;
    var temp = "";
    for (var index in obj) {
        if (index != 'main_description') {
            temp += (index + ':' + obj[index] + '\n');
        }

    }
    content += temp + '\n' + '---\n';

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
   /*
   console.log("image_url:"+image_url);
   console.log("filename:"+filename);
   console.log("locationInGit:"+locationInGit);
   return null;
   */
   tmp.file({ mode: parseInt('0644',8), prefix: 'openatimg-', postfix: '.jpg' },function _tempFileCreated(err, path, fd) {
     if (err) throw err;
     exports.download(image_url,path, function() {
      var imaget = sharp(path)
         .resize(250, 250)
         .png()
         .toFile('download_image/' +filename+'-thumb.png', function(err) {
            });

      var imagel = sharp(path)
         .resize(500, 500)
         .png()
         .toFile('download_image/' +filename+'.png', function(err) {
            });
      });
   });
   //Now write to Github - NB - NOT ASYNC. QUICK FIX
   if (fs.existsSync('download_image/' +filename+'-thumb.png')) {
      exports.writeFileToGithub('download_image/' +filename+'-thumb.png',locationInGit+filename+'-thumb.png');
   }
   if (fs.existsSync('download_image/' +filename+'.png')) {
      exports.writeFileToGithub('download_image/' +filename+'.png',locationInGit+filename+'.png');
   }
};
