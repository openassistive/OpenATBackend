'use strict';
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var contentCreator = require('../functions');
var toMarkdown = require('to-markdown');
var moment = require('moment');

exports.scrape_Sourceforge = function(req, res) {
    var url = 'http://www.sourceforge.net'; // + req.params.id + '/' + req.params.url;
    if (req.params.url0 != undefined && req.params.url0 != '') {
        url += '/' + req.params.url0;
    }
    if (req.params.url1 != undefined && req.params.url1 != '') {
        url += '/' + req.params.url1;
    }
    if (req.params.url2 != undefined && req.params.url2 != '') {
        url += '/' + req.params.url2;
    }
    if (req.params.url3 != undefined && req.params.url3 != '') {
        url += '/' + req.params.url3;
    }
    if (req.params.url4 != undefined && req.params.url4 != '') {
        url += '/' + req.params.url4;
    }
    if (req.params.url5 != undefined && req.params.url5 != '') {
        url += '/' + req.params.url5;
    }
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
                enable_download = 1,
                short_title = "";
            var json = {
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

            json.type = "software";
            json.project_url = $('a#homepage').attr("href");
            json.original_url = url;
            // Get the Title. This is pretty important
            $('div#project-title h1').filter(function() {
                var data = $(this);
                title = data.text().trim();
            })

            if (title == undefined || title == '' || title == "404") {
                title = 'sourceforge Page not found';
                enable_download = 0;
                res.json({ error: "page not found"});
                return;
            }
            var rexp = /( by)([a-zA-Z0-9-|()! ]+)+( Sourceforge)/ig;
            title = title.replace(rexp, '');
            json.title = title.trim();
            json.short_title = contentCreator.genShortTitle(json.title);
            json.License = $('section#project-categories-and-license section.content a').text().trim();
            json.datemod = moment($('time.dateUpdated').text().trim()).format("YYYY-MM-DD HH:mm");
            authors = "";
            $("p[itemprop='author'] span[itemprop='name']").each(function(index, item) {

                if (index > 0) {
                    authors += ', ';
                }
                if (item.children[0].data != undefined) {
                    authors = authors + item.children[0].data; //.text().trim();
                }

            });
            json.authors = authors;
            $('section#download_button a').filter(function() {
                var data = $(this);
                if (data.attr('title').includes('Download') == true) {
                    download_url = 'http://www.sourceforge.net' + data.attr("href");
                }
                json.download_url = download_url;
            })


            $("meta[name=description]").filter(function() {
                var data = $(this);
                description = data.attr('content');

                json.description = description;
            })
            var img_url = $("div.strip img").first();
            if (img_url != undefined && img_url != "") {
                image = img_url.attr("src");
                json.image = image;
                image_download = "http:" + image;
            } else {
                img_url = $('img').first();
                image = img_url.attr("src");
                json.image = image;
                image_download = "http:" + image;
            }
            /*
            $("div.strip img").first().filter(function() {
                var data = $(this);
                image = data.attr("src");

                console.log(data.attr('alt'));
                json.image = image;
                image_download = "http:" + image;
            })
            */
            if (image != undefined && image != "") {
                json.image = "images/" + json.short_title + ".png";
                json.thumb = "images/" + json.short_title + "-thumb.png";
                json.image_download = image_download;
            }
            $("p#description").filter(function() {
                var data = $(this);
                main_description = toMarkdown(data.html());
                json.main_description = main_description;
            })

          res.json(json);
        } else {
            res.json({ error: "Sorry. Server was slow to respond. Try later or get a new internet"});
        }
    })
};
