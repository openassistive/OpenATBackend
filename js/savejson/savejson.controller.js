'use strict';
var request = require('request');
var contentCreator = require('../functions');

exports.saveJSON = function(req, res) {
   
   if (!req.body){
    console.log('no body');
    return res.sendStatus(400);
   } 
   /* WARNING!!!
      
      there is no error checking!!!! 
      we should probably check there is a title and original url if nothing else!!
      @to-do
      
   */
   
   var json = req.body;
   
   if (!json.title) {
    console.log('no title');
    return res.json({ error: "Sorry, the item needs a title" });
   }
   
   if (!json.short_title) {
    console.log('no short title');
    return res.json({ error: "Sorry, the item needs a short_title" });
   }   
   
   if (!json.original_url) {
    console.log('no orig url');
    return res.json({ error: "Sorry, the item needs a original_url" });   
   }
   
   // we need to write to GitHub - not just download
   // need to fix tags - maybe in the generateMDFile function
   if (json.image_download){
      contentCreator.SaveImagesToGitHub(json.image_download, './download_image/' + json.title_img, 'item-images/');
   }
   
   contentCreator.writeDataToGithub(contentCreator.generateMDFile(json), 'content/item/'+json.short_title + '.md', function (err) {
     if (err) throw err
     //console.log('It\'s saved!')
     return res.json({success: json.short_title});
   });

};