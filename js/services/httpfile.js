'use strict';
var contentCreator = require('../functions');
var moment = require('moment');
var scraperjs = require('scraperjs');
var toMarkdown = require('to-markdown');

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
        main_description: "",
        original_url: "",
        short_title: ""
      };

      result.type = "hardware";
      result.project_url = url;
      result.original_url = url;
      result.title = $('div.title-bar h1.title').text().trim() || '404';

      if (result.title == '404') {
        throw { text: 'Project not found.', status: 400 };
      }

      var rexp = /( by)([a-zA-Z0-9-|()! ]+)+( Instructables)/ig;
      result.title = result.title.replace(rexp, ' ').trim();
      result.short_title = contentCreator.genShortTitle(result.title);
      result.License = $('section#project-categories-and-license section.content a').text().trim();

      // Oct. 5, 2015, 8:12 a.m.
      result.datemod = moment($('meta[itemprop=datePublished]').attr('content'),'MMM. D, YYYY, h:mm a').format("YYYY-MM-DD HH:mm");

      result.authors = "";
      $('span.author a[rel="author"]').each(function(index, item) {
        if (index > 0) {
            result.authors += ', ';
        }
        if (item.children[0].data != undefined) {
            result.authors += item.children[0].data; //.text().trim();
        }
      });

      result.download_url = 'http://www.instructables.com'+$('div.pull-left a#download-pdf-btn-top').attr('data-return-url');

      $("meta[name=description]").filter(function() {
        var data = $(this);
        result.main_description = data.attr('content');
      });

      result.image_download = ($("div.photoset-image img").first() || $('img').first()).attr("src");

      $("p.description").filter(function() {
        result.description = $(this).text();
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
