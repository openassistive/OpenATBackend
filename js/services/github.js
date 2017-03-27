'use strict';
var contentCreator = require('../functions');
var moment = require('moment');
var scraperjs = require('scraperjs');
var github = require('octonode');

var fromApi = function(repoPath) {
  var client = github.client();
  var promise = new Promise(function(resolve, reject) {
    client.get('/repos' + repoPath, function(err, status, body, headers) {
      if(err && err.statusCode === 404) {
        return reject({
          status: 400,
          text: 'Project not found.'
        });
      }

      if (err) {
        return reject(err);
      }

      var result = {
        title: body.name,
        short_title: body.name,
        authors: body.owner.login,
        datemod: body.updated_at,
        download_url: body.html_url + '/releases',
        project_url: body.html_url,
        description: body.description,
        main_description: body.description,
        image: 'images/full/' + body.name,
        thumb: 'images/thumb/' + body.name,
        original_url: body.html_url
      };

      return resolve(result);
    })
  });

  return promise;
};

var scrape = function(url) {
  return scraperjs.StaticScraper.create(url)
    .scrape(function($) {

      var result = {};

      var project_url = $('span.repository-meta-content a').first().attr('href');
      if(project_url) {
        result.project_url = project_url;
      }

      result.License = $('h1:contains("License")').first().next('p').text()
        || $('h2:contains("License")').first().next('p').text()
        || $('h3:contains("License")').first().next('p').text();

      if ($('span.num.text-emphasized').first().text().trim() == '0') {
        var data = $('div.mt-2 a').first();
        result.download_url = data[0]['attribs']['href'];
      }

      var data_img = $('article.markdown-body.entry-content img').first();
      if (data_img == undefined || data_img == '') {
        data_img = $('img').first();
        result.image_download = data_img.attr("src");
      } else {
        result.image_download = data_img[0]['attribs']['src'];
      }

      for (var index in result) {
         if (!result[index] || /^\s*$/.test(result[index])) {
           delete result[index];
         }
      }

      return result;
    });
};

exports.handler = function(req, res, next) {
  var url = req.projectUrl;
  var repoPath = req.repoPath;

  Promise.all([
    fromApi(repoPath),
    scrape(url)
  ]).then(function(result) {
    req.result = Object.assign({}, result[0], result[1]);
    return next(req, res);
  }).catch(function(err) {
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
