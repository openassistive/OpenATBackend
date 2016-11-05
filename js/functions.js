'use strict';

var fs = require('fs');
var request = require('request');
var http = require("http");

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


exports.SaveImages = function(imageURL, imageFilename, callback) {

   console.log(imageURL);
   console.log(imageFilename);
   
   // First apply a square operation, then convert to PNG format 
   // this is for the thumb
   var paramOperation1 = "square";
   var paramValue1 = 250;
   var paramOperation2 = "format";
   var paramValue2 = "png"; // Other formats available: jpg, gif, tiff and webp.
   console.log("http://api.rethumb.com/v1/" + paramOperation1 + "/" + paramValue1 + "/" + paramOperation2 + "/" + paramValue2 + "/" + imageURL);

   http.get("http://api.rethumb.com/v1/" + paramOperation1 + "/" + paramValue1 + "/" + paramOperation2 + "/" + paramValue2 + "/" + imageURL,
       function(response) {
           response.pipe(fs.createWriteStream(imageFilename+'-thumb.png'));
       }
   );

   // First apply a square operation, then convert to PNG format 
   // this is for the bigger version
   var paramValue1 = 500;
   http.get("http://api.rethumb.com/v1/" + paramOperation1 + "/" + paramValue1 + "/" + paramOperation2 + "/" + paramValue2 + "/" + imageURL,
       function(response) {
           response.pipe(fs.createWriteStream(imageFilename+'.png'));
       }
   );

}

exports.download = function(uri, filename, callback) {

    request.head(uri, function(err, res, body) {
        console.log('Let me download');
        var req = request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};

var https = require('https');
exports.download1 = function(url, dest, cb) {
    console.log("Start downloading")
    var file = fs.createWriteStream(dest);
    var req = https.get(url, function(response) {
        response.pipe(file);
        file.on('finish', function() {
            file.close(cb); // close() is async, call cb after close completes.
        });
    }).on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        if (cb) {
            cb(err.message);
            console.log(err.message);
        }

    });
};