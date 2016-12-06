'use strict';
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var http = require('http');
var contentCreator = require('../functions');
var toMarkdown = require('to-markdown');
var moment = require('moment');

var image_download = "";

exports.scrape_Thingiverse = function(req, res) {
    var url = 'http://www.thingiverse.com'; // + req.params.id; // + '/' + req.params.url;
    var reponame = "thingiverse";
    if (req.params.url0 != undefined && req.params.url0 != '') {
        url += '/' + req.params.url0;
        reponame = req.params.url0;
    }
    if (req.params.url1 != undefined && req.params.url1 != '') {
        url += '/' + req.params.url1;
        reponame = req.params.url1;
    }
    if (req.params.url2 != undefined && req.params.url2 != '') {
        url += '/' + req.params.url2;
        reponame = req.params.url2;
    }
    if (req.params.url3 != undefined && req.params.url3 != '') {
        url += '/' + req.params.url3;
        reponame = req.params.url3;
    }
    if (req.params.url4 != undefined && req.params.url4 != '') {
        url += '/' + req.params.url4;
        reponame = req.params.url4;
    }
    if (req.params.url5 != undefined && req.params.url5 != '') {
        url += '/' + req.params.url5;
        reponame = req.params.url5;
    }
    exports.scrape(url, reponame, res);
};
exports.scrape = function(url, reponame, res) {
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

    request(url, function(error, response, html) {
        if (!error) {
            var $ = cheerio.load(html);


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
                original_url: ""
            };

            json.type = "hardware";
            json.project_url = url;
            json.original_url = url;
            title = $('title').text().trim();
            if (title == undefined || title == '' || title == '404') {
                title = 'thingiverse - Page not found';
                enable_download = 0;
                res.json({ error: "page not found"});
                return;
            }
            var rexp = /( by)([a-zA-Z0-9-|()! ]+)+( Thingiverse)/ig;
            title = title.replace(rexp, ' ');
            json.title = title.trim();

            json.short_title = contentCreator.genShortTitle(json.title);
            json.License = $('div.thing-license').first().attr('title');

            //Format date. Moment isnt good enough
            json.datemod = moment($('div.thing-header-data time').attr('datetime'),'YYYY-MM-DD HH:mm:ss').format("YYYY-MM-DD HH:mm");

            authors = "";
            $('div.thing-header-data a').each(function(index, item) {


                if (item.children[0].data != undefined && !authors.includes(item.children[0].data)) {
                    if (index > 0) {
                        authors += ', ';
                    }
                    authors = authors + item.children[0].data; //.text().trim();

                }

            });
            json.authors = authors;
            json.download_url = 'http://www.thingiverse.com'+$('a.thing-download-btn').attr('href');


            $("meta[name=description]").filter(function() {
                var data = $(this);
                description = data.attr('content');

                json.description = description;
            })
            var img_url = $("div.thing-page-image img").first();
            //console.log(img_url);

            if (img_url == undefined || img_url == "") {
                img_url = $('img').first();
                image = img_url.attr('src');
            } else {
                image = img_url[0].attribs['data-cfsrc'];
            }
            json.image = image;
            image_download = image;
            if (image != undefined && image != "") {
                json.image = "images/" + json.short_title + ".png";
                json.thumb = "images/" + json.short_title + "-thumb.png";
                json.image_download= image_download;
            }
            $("div.description").filter(function() {
                var data = $(this);
                main_description = toMarkdown(data.html());

                json.main_description = main_description;
            })

        }

        res.json(json);

    });


};
