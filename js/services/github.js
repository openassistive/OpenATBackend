'use strict';
var contentCreator = require('../functions');
var moment = require('moment');
var scraperjs = require('scraperjs');

exports.handler = function(req, res) {
  var url = req.projectUrl;
  scraperjs.StaticScraper.create(url)
    .scrape(function($) {

      var result = {
        title            : "",
        short_title      : "",
        type             : "",
        authors          : "",
        license          : "",
        datemod          : "",
        download_url     : "",
        project_url      : "",
        description      : "",
        main_description : "",
        image            : "",
        thumb            : "",
        original_url     : ""
      };

      result.type = "software";
      result.project_url = $('span.repository-meta-content a').first().attr('href') || url;
      result.original_url = url;

      result.title = $('h1').first().text().trim();

      if (!result.title || result.title == '404') {
        throw { text: 'Project not found.', status: 400 };
      }

      var rexp = /( by)([a-zA-Z0-9-|()! ]+)+( Github)/ig;
      result.title = result.title.replace(rexp, ' ').trim();
      result.short_title = contentCreator.genShortTitle(result.title);
      result.authors = $('span.author').text().trim();

      result.license = $('h1:contains("License")').first().next('p').text()
        || $('h2:contains("License")').first().next('p').text()
        || $('h3:contains("License")').first().next('p').text();

      result.datemod = moment($('relative-time').attr("datetime").trim()).format("YYYY-MM-DD HH:mm");

      if ($('span.num.text-emphasized').first().text().trim() != '0') {
          result.download_url = url + '/releases';
      } else {
          var data = $('div.mt-2 a').first();
          result.download_url = data[0]['attribs']['href'];
      }

      result.description = $('meta[name=description]').attr('content');
      result.main_description = result.description;

      var data_img = $('article.markdown-body.entry-content img').first();
      if (data_img == undefined || data_img == '') {
          data_img = $('img').first();
          result.image = data_img.attr("src");
      } else {
          result.image = data_img[0]['attribs']['src'];
      }

      if (!!result.image) {
          var re = /[\w* ]+/i;
          var title_img = re.exec(result.title)[0] || github;
          title_img = title_img.toLowerCase().trim();

          var patt1 = /\s/g;
          title_img = title_img.replace(patt1, '_');
          result.image_download = result.image;
          result.image = "images/full/" + title_img;
          result.thumb = "images/thumb/" + title_img;
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

      return res
        .status(500)
        .json({ error: "Sorry. There was problems retrieving the information."});
    });
};

