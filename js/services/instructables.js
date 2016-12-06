'use strict';
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var contentCreator = require('../functions');
var toMarkdown = require('to-markdown');
var moment = require('moment');

exports.scrape_Instructables = function(req, res) {
    var url = 'http://www.instructables.com'; // + req.params.id + '/' + req.params.url;
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

            json.type = "hardware";
            json.project_url = url;
            json.original_url = url;
            title = $('div.title-bar h1.title').text().trim();
            if (title == undefined || title == '' || title == '404') {
                title = 'instructables - Page not found';
                enable_download = 0;
                res.json({ error: "page not found"});
                return;
            }
            var rexp = /( by)([a-zA-Z0-9-|()! ]+)+( Instructables)/ig;
            title = title.replace(rexp, ' ');
            json.title = title.trim();
            json.short_title = contentCreator.genShortTitle(json.title);
            json.License = $('section#project-categories-and-license section.content a').text().trim();


            // Oct. 5, 2015, 8:12 a.m.
            json.datemod = moment($('meta[itemprop=datePublished]').attr('content'),'MMM. D, YYYY, h:mm a').format("YYYY-MM-DD HH:mm");
            authors = "";
            $('span.author a[rel="author"]').each(function(index, item) {

                if (index > 0) {
                    authors += ', ';
                }
                if (item.children[0].data != undefined) {
                    authors = authors + item.children[0].data; //.text().trim();
                }

            });
            json.authors = authors;
            json.download_url = 'http://www.instructables.com'+$('div.pull-left a#download-pdf-btn-top').attr('data-return-url');


            $("meta[name=description]").filter(function() {
                var data = $(this);
                main_description = data.attr('content');

                json.main_description = main_description;
            })
            var img_url = $("div.photoset-image img").first();

            if (img_url == undefined || img_url == "") {
                img_url = $('img').first();
                image = img_url.attr("src");
            } else {
                image = img_url.attr("src");
            }

            console.log(image);
            json.image = image;
            image_download = image;

            if (image != undefined && image != "") {
                json.image = "images/" + json.short_title + ".png";
                json.thumb = "images/" + json.short_title + "-thumb.png";
                json.image_download = image_download;

            }

            $("p.description").filter(function() {
                var data = $(this);
                description = data.text();

                json.description = description;
            })
        }


        res.json(json);
    })
};
