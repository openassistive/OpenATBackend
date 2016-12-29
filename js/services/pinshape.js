'use strict';
var contentCreator = require('../functions');
var moment = require('moment');
var scraperjs = require('scraperjs');
var toMarkdown = require('to-markdown');

exports.handler = function(req, res) {
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
        main_description: "",
        image: "",
        thumb: "",
        original_url: "",
        short_title: ""
      };

      result.type = "hardware";
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

        result.datemod =  moment(pinshape_JSON.updated_at).format('YYYY-MM-DD HH:mm');
        result.project_url =  url;
        result.description = toMarkdown(pinshape_JSON.description.substring(7));
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

      if (result.image_download != undefined && result.image_download != "") {
          result.image = "images/" + result.short_title + ".png";
          result.thumb = "images/" + result.short_title + "-thumb.png";
      }

      return result;
    })
    .then(function(result) {
      return res.json(result);
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
