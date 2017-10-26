'use strict';
var contentCreator = require('../functions');
var scraperjs = require('scraperjs');
var toMarkdown = require('to-markdown');
var moment = require('moment');
const util = require('../util')

exports.handler = function(req, res, next) {
  var url = req.projectUrl;

  scraperjs.StaticScraper.create(url)
    .scrape(function($) {
   var result = {
     title: "",
     authors: "",
     License: "",
     datemod: "",
     download_url: "",
     project_url: "",
     description: "",
     tags: ["un-tagged", "in-progress"],
     categories: ["hardware"],
     main_description: "",
     image: "",
     thumb: "",
     original_url: "",
     short_title: ""
   };
   

   result.project_url = url;
   result.original_url = url;
   result.title = $('div.container h1').first().text().trim() || '404';

   if (result.title == '404') {
     throw { text: 'Project not found.', status: 400 };
   }

   result.short_title = contentCreator.genShortTitle(result.title);
   result.License = 'Unknown';
   result.main_description = $('meta[name="twitter:description"]').attr('content');
   result.authors = $('div.author span.identity-card').text().trim();
   result.description = result.main_description.substr(0,120)+' ...'

   var dateInfo =  $('p.project-time').text().trim();
   var regexString = /This project was\s+created on ([0-9]{2})\/([0-9]{2})\/([0-9]{4})\s+and last updated ([0-9]+) ([a-zA-Z]+)/i;
   var arrMatches = dateInfo.trim().match(regexString);
   result.date = moment([arrMatches[3], arrMatches[1], arrMatches[2]]).format();
   result.datemod = moment().subtract(arrMatches[4], arrMatches[5]).format();
   
   result.download_url = url;
   result.image_download = $('meta[name="twitter:image"]').attr('content');
   return result;
   })
   .then(function(result) {
      req.result = result;
      return next(req, res);
    })
   .catch(function(err) {
      if(err.status) {
        return res
          .status(err.status)
          .json({ error: err.text });
      }

      return res
        .status(500)
        .json({ error: "Sorry. There was problems retrieving the information."});
    });
};
