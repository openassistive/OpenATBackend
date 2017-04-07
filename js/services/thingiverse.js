'use strict';
var contentCreator = require('../functions');
var scraperjs = require('scraperjs');
var toMarkdown = require('to-markdown');
const util = require('../util')

exports.handler = function(req, res, next) {
  var url = req.projectUrl;

  scraperjs.StaticScraper.create(url)
    .scrape(function($) {

      var result = {
        title: "",
        type: "",
        authors: "",
        License: "",
        datemod: "",
        download_url: "",
        project_url: "",
        description: "",
        tags: ["un-tagged"],
        categories: ["hardware"],
        main_description: "",
        image: "",
        thumb: "",
        original_url: "",
        short_title: ""
      };

      result.type = "hardware";
      result.project_url = url;
      result.original_url = url;
      result.title = $('title').text().trim() || 'About THING - Thingiverse';

      if (result.title === 'About THING - Thingiverse' || result.title === '404 Not Found') {
          throw { text: 'Project not found.', status: 400 };
      }

      var rexp = /( by)([a-zA-Z0-9-|()! ]+)+( Thingiverse)/ig;
      var rexp2 = /(- Thingiverse)/ig;
      result.title = result.title.replace(rexp, ' ').trim();
      result.title = result.title.replace(rexp2, '').trim();

      result.short_title = contentCreator.genShortTitle(result.title);
      result.License = $('div.thing-license').first().attr('title');
      var datemod = Date.parse($('div.thing-header-data time').attr('datetime'));
      if(!datemod) // could not parse datemod
        datemod = new Date();
      result.datemod = util.dateISOString(datemod);

      result.authors = "";

      $('div.thing-header-data a').each(function(index, item) {
        if (item.children[0].data != undefined && !result.authors.includes(item.children[0].data)) {
          if (index > 0) {
              result.authors += ', ';
          }
          result.authors += item.children[0].data; //.text().trim();
        }
      });

      result.download_url = 'http://www.thingiverse.com'+$('a.thing-download-btn').attr('href');

      $("meta[name=description]").filter(function() {
        result.description = $(this).attr('content');
      });

      var img_url = $("div.thing-page-image img").first();

      if (img_url == undefined || img_url == "") {
        img_url = $('img').first();
        result.image_download = img_url.attr('src');
      } else {
        result.image_download = img_url[0].attribs['data-cfsrc'];
      }

      if (result.image_download != undefined && result.image_download != "") {
        result.image = "images/" + result.short_title + ".png";
        result.thumb = "images/" + result.short_title + "-thumb.png";
      }

      $("div.description").filter(function() {
        var data = $(this);
        result.main_description = toMarkdown(data.html());
      });

      for (var index in result) {
         if (!result[index] || /^\s*$/.test(result[index])) {
           delete result[index];
         }
      }

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
