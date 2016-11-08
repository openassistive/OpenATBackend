'use strict';

var fs = require('fs');
var request = require('request');
var http = require("http");

var sharp = require('sharp');

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
        console.log('Let me download');
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