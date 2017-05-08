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
        categories: ["hardware"],
        main_description: "",
        original_url: "",
        short_title: ""
      };

      result.project_url = url;
      result.original_url = url;

      //Sneaky. This may get pulled in the future! The below is left in the comments just incase
      $('a.repin.space-right').filter(function() {
        var data = $(this);
        var pinshape_JSON = JSON.parse(data.attr('data-id'));

        result.title= pinshape_JSON.name;
        result.short_title = contentCreator.genShortTitle(result.title);
        result.download_url = pinshape_JSON.zip_file.url;
        result.License =  pinshape_JSON.usage_license;

        $('div.designed-by a').filter(function() {
          var data = $(this);
          result.authors = data.text().trim();
        })
        
        var datemod = Date.parse(pinshape_JSON.updated_at);
        if(!datemod) // could not parse datemod
          datemod = new Date();
        result.datemod = util.dateISOString(datemod);
        result.project_url =  url;
        result.description = toMarkdown(pinshape_JSON.description.substring(7,180));
        result.main_description  = toMarkdown(pinshape_JSON.description.substring(7));
        result.original_url =  url;
      })

      if (!result.title) {
        throw { text: 'Project not found.', status: 400 };
      }

      $('a.button-download').filter(function() {
        result.download_url = url + $(this).attr('href');
      })

      $("div.article-image img").first().filter(function() {
        var data = $(this);
        result.image_download = 'http:' + (data[0].attribs['data-cfsrc']
          || $('img').first().attr("src"));
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

      console.log(err);
      return res
        .status(500)
        .json({ error: "Sorry. There was problems retrieving the information."});
    });
};
