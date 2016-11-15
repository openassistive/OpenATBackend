'use strict';
var request = require('request');
var contentCreator = require('../functions');

exports.saveJSON = function(req, res) {
   
   if (!req.body) return res.sendStatus(400);
   /* WARNING!!!
      
      there is no error checking!!!! 
      we should probably check there is a title and original url if nothing else!!
      @to-do
      
   */
   
   var json = req.body;

   // we need to write to GitHub - not just download
   // need to fix tags - maybe in the generateMDFile function
   contentCreator.SaveImages(json.image_download, './download_image/' + json.title_img);
   contentCreator.writeDataToGithub(json.short_title + '.md', contentCreator.generateMDFile(json), function (err) {
     if (err) throw err
     console.log('It\'s saved!')
   });
   res.json('Complete');

};