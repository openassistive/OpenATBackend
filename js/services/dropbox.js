'use strict';
const request = require('request')
const util = require('../util')
const contentCreator = require('../functions')
const scraperjs = require('scraperjs')
const httpfile = require('./httpfile')

exports.handler = function(req, res, next) {
  
  let pttrn01 = new RegExp("https?:\\/\\/(www\\.)dropbox\\.com\\/[^\\?\\s]+(\\?dl=[01])?$");
  function url_dl_filter(s, dl) { // add dl when it's needed for downloading
    if(dl == null)
      dl = 1;
    let match = s.match(pttrn01);
    if(match)
      return (match[2] ? s.slice(0, s.length - 5) : s) + '?dl=' + dl;
    return s;
  }

  req.url_dl_filter = url_dl_filter; // httpfile input dl filter

  // quick solution, if input is the .md file then delegate to httpfile
  if(req.projectUrl.endsWith('.md')) {
    httpfile.handler(req, res, next)
  } else {
    scraperjs.StaticScraper.create(url_dl_filter(req.projectUrl, 0))
      .scrape(function($) {
        let files = [];
        $('.sl-link--file').each(function() {
          var $el = $(this),
              filename = $el.find('.sl-grid-filename').text(),
              link = $el.attr('href');
          if(filename && link)
            files.push({ filename, link });
        });
        search(files)
          .then((data) => {
            // req.originalUrl = req.projectUrl; // may cause problems
            req.projectUrl = data.link;
            httpfile.handler_step2(data.item, req, res, next); // delegate
          })
          .catch((err) => {
            console.error(err);
            res.status(422).json({ error: "No .md file with expected format found" });
          });
        
        function search(files) {
          var file;
          while(file = files.shift())
            if(file.filename.toLowerCase().endsWith(".md"))
              break;
          if(!file)
            return Promise.reject('notfound')
          return try_url(file.link)
            .then((item) => Object.assign({ item }, file))
            .catch(() => {
              return search(files)
            });
        }
      });
  }
  function try_url(s) {
    return new Promise((resolve, reject) => {
      request({url: url_dl_filter(s) , encoding: 'utf8'}, function(err, resp, body) {
        if(err) {
          reject()
        } else {
          try {
            // parse data
            let item = util.parseItem(body);
            resolve(item);
          } catch(err) {
            reject()
          }
        }
      });
    });
  }
  
};
