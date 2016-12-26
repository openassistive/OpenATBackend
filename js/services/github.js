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
        title: body.full_name,
        short_title: body.name,
        authors: body.owner.login,
        datemod: body.updated_at,
        download_url: body.html_url + '/releases',
        project_url: body.html_url,
        description: body.description,
        main_description: body.description,
        image: 'images/full/' + body.owner.login.replace(/\s/g, '_'),
        thumb: 'images/thumb/' + body.owner.login.replace(/\s/g, '_'),
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

      result.license = $('h1:contains("License")').first().next('p').text()
        || $('h2:contains("License")').first().next('p').text()
        || $('h3:contains("License")').first().next('p').text();

      if ($('span.num.text-emphasized').first().text().trim() == '0') {
          var data = $('div.mt-2 a').first();
          result.download_url = data[0]['attribs']['href'];
      }

      var data_img = $('article.markdown-body.entry-content img').first();
      if (data_img == undefined || data_img == '') {
          data_img = $('img').first();
          result.image_donwload = data_img.attr("src");
      } else {
          result.image_donwload = data_img[0]['attribs']['src'];
      }

      return result;
    });
};

var scrapeAll = function(req, res) {
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
        original_url     : "",
        image_download   : "",
      };

      result.type = "software";
      result.project_url = $('span.repository-meta-content a').first().attr('href') || url;
      result.original_url = url;

      result.title = $('h1').first().text().trim();
      var breakIndex = result.title.indexOf('\n');

      if (breakIndex !== -1) {
        result.title = result.title.substr(0, breakIndex);
      }

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

      try {
        result.datemod = moment($('relative-time').attr("datetime").trim()).format("YYYY-MM-DD HH:mm");
      }
      catch(ex) {

      }

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

      console.log(err);
      return res
        .status(500)
        .json({ error: "Sorry. There was problems retrieving the information."});
    });
};

exports.handler = function(req, res) {
  var url = req.projectUrl;
  var repoPath = req.repoPath;

  Promise.all([
    fromApi(repoPath),
    scrape(url)
  ]).then(function(result) {
    var data = Object.assign({}, result[0], result[1]);
    return res.json(data);
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
