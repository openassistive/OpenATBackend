'use strict';
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var contentCreator = require('../functions');
var toMarkdown = require('to-markdown');
var moment = require('moment');

exports.scrape_Github = function(req, res) {
    var path = req.query.path;
    var url = 'http://www.github.com' + path;

    exports.scrape(url, res);
};

exports.scrape = function(url, res) {

    request(url, function(error, response, html) {
        if (!error) {
            var $ = cheerio.load(html);

            var title = "",
                datemod = "",
                authors = "",
                License = "",
                download_url = "",
                project_url = "",
                description = "",
                image = "",
                original_url = "",
                main_description = "",
                image_download = "",
                enable_download = 1;
            var json = {
                title: "",
                type: "",
                authors: "",
                License: "",
                datemod: "",
                download_url: "",
                project_url: "",
                description: "",
                image: "",
                thumb: "",
                original_url: ""
            };

            //json.tags = tags;
            json.type = "software";
            project_url = $('span.repository-meta-content a').first().attr('href');
            if (project_url == undefined || project_url == "") {
                project_url = url;
            }
            json.project_url = project_url;
            json.original_url = url;
            title = $('h1').first().text().trim();
            if (title == undefined || title == '' || title == '404') {
                title = 'github - Page not found';
                enable_download = 0;
                res.json({ error: "page not found"});
                return;
            }
            var rexp = /( by)([a-zA-Z0-9-|()! ]+)+( Github)/ig;
            title = title.replace(rexp, ' ');
            json.title = title.trim();
            json.short_title = contentCreator.genShortTitle(json.title);
            json.authors = $('span.author').text().trim();

            License = $('h1:contains("License")').first().next('p').text();

            if (License == '' || License == undefined) {
                License = $('h2:contains("License")').first().next('p').text();
            }
            if (License == '' || License == undefined) {
                License = $('h3:contains("License")').first().next('p').text();
            }

            json.License = License;
            console.log(json);
            //json.datemod = moment($('relative-time').attr("datetime").trim()).format("YYYY-MM-DD HH:mm");
            if ($('span.num.text-emphasized').first().text().trim() != '0') {
                download_url = url + '/releases';
            } else {
                var data = $('div.mt-2 a').first();
                download_url = data[0]['attribs']['href'];
            }
            json.download_url = download_url;

            $("meta[name=description]").filter(function() {
                var data = $(this);
                description = data.attr('content');

                json.description = description;
            })
            json.main_description = description;
            image = "";
            var data_img = $('article.markdown-body.entry-content img').first();
            if (data_img == undefined || data_img == '') {
                data_img = $('img').first();
                image = data_img.attr("src");
            } else {
                image = data_img[0]['attribs']['src'];
            }

            // console.log(data_img[0]['attribs']['src']);
            if (image != undefined && image != "") {
                var re = /[\w* ]+/i;
                var title_img = re.exec(title)[0];
                json.image = "images/full/" + title_img;
                json.thumb = "images/thumb/" + title_img;

                if (title_img == undefined || title_img == '') {
                    title_img = 'github';
                }
                title_img = title_img.toLowerCase().trim();
                var patt1 = /\s/g;
                title_img = title_img.replace(patt1, '_');
                json.image = "images/full/" + title_img;
                json.thumb = "images/thumb/" + title_img;
                json.image_download = image;
            }

        }

        res.json(json);

    })
};

exports.handler = exports.scrape_Github;
