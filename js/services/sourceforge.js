'use strict';
var contentCreator = require('../functions');
var scraperjs = require('scraperjs');
var toMarkdown = require('to-markdown');
const util = require('../util')
const request = require('request');
const murl = require('url');

exports.handler = function(req, res, next) {
  var url = req.projectUrl;
  (new Promise(function(resolve, reject) {
    request('https://sourceforge.net/rest/p/' + req.query.id, function (error, response, body) {
      if(error != null || response.statusCode >= 400) {
        if(response.statusCode == 404) {
          reject({ text: 'Project not found.', status: 400 });
        } else {
          reject(error || new Error("Unexpected response status code: " + response.statusCode));
        }
      } else {
        try {
          resolve(JSON.parse(body));
        } catch(err) {
          reject(err);
        }
      }
    });
  }))
    .then(function(data) {
      return scraperjs.StaticScraper.create(url).scrape(function($) {
        var result = {
          title: "",
          authors: "",
          license: "",
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

        result.project_url = data.url;
        result.original_url = url;

        result.title = data.name;

        var rexp = /( by)([a-zA-Z0-9-|()! ]+)+( Sourceforge)/ig;
        result.title = result.title.replace(rexp, ' ').trim();
        result.short_title = contentCreator.genShortTitle(result.title);

        if (data.categories.license && data.categories.license.length > 0) {
          result.license = data.categories.license[0].fullname;
        }

        var datemod = Date.parse($('time.dateUpdated').text().trim());
        if(!datemod) // could not parse datemod
          datemod = new Date();
        result.datemod = util.dateISOString(datemod);

        result.authors = data.developers.map((a) => a.name).join(", ");
        var dlhref = $('#pg_project a.download').attr('href');
        if(dlhref) {
          result.download_url = murl.resolve('http://www.sourceforge.net/', dlhref);
        }
        result.main_description = result.description = data.short_description;
        result.image_download = data.icon_url;
        $('#pg_project p.description').filter(function() {
          var data = $(this);
          result.main_description = toMarkdown(data.html()) || result.main_description;
        })

        for (var index in result) {
          if (!result[index] || /^\s*$/.test(result[index])) {
            delete result[index];
          }
        }
        return result;
      });
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
