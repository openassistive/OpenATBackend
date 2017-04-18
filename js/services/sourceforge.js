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
        authors: "",
        License: "",
        datemod: "",
        download_url: "",
        project_url: "",
        description: "",
        tags: ["un-tagged"],
        categories: ["software"],
        main_description: "",
        original_url: "",
        short_title: ""
      };

      result.project_url = $('a#homepage').attr("href");
      result.original_url = url;

      result.title = $('div#project-title h1').text().trim() || '404';

      if (result.title == '404') {
        throw { text: 'Project not found.', status: 400 };
      }

      var rexp = /( by)([a-zA-Z0-9-|()! ]+)+( Sourceforge)/ig;
      result.title = result.title.replace(rexp, ' ').trim();
      result.short_title = contentCreator.genShortTitle(result.title);

      result.License = $('section#project-categories-and-license section.content a').text().trim();

      var datemod = Date.parse($('time.dateUpdated').text().trim());
      if(!datemod) // could not parse datemod
        datemod = new Date();
      result.datemod = util.dateISOString(datemod);

      var authors = "";
      $("p[itemprop='author'] span[itemprop='name']").each(function(index, item) {
        if (index > 0) {
          authors += ', ';
        }
        if (item.children[0].data != undefined) {
          authors = authors + item.children[0].data; //.text().trim();
        }
      });
      result.authors = authors;

      $('section#download_button a').filter(function() {
        var data = $(this);
        if (data.attr('title').includes('Download') == true) {
          result.download_url = 'http://www.sourceforge.net' + data.attr("href");
        }
      })

      result.description = $('meta[name=description]').attr('content');
      result.main_description = result.description;

      var img_url = $("div.strip img").first();
      var image_download;
      var image;

      if (!!img_url) {
        image = img_url.attr("src");
        image_download = "http:" + image;
      } else {
        img_url = $('img').first();
        image = img_url.attr("src");
        image_download = "http:" + image;
      }

      if (!!image) {
        result.image_download = image_download;
      }

      $("p#description").filter(function() {
        var data = $(this);
        result.main_description = toMarkdown(data.html());
      })

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

      console.log(err);
      return res
        .status(500)
        .json({ error: "Sorry. There was problems retrieving the information."});
    });
};
