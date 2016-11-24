'use strict';
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var contentCreator = require('../functions');
var toMarkdown = require('to-markdown');
var moment = require('moment');

exports.scrape_Pinshape = function(req, res) {
    var url = 'http://www.pinshape.com'; // + req.params.id + '/' + req.params.url;
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
    console.log(url);
    request(url, function(error, response, html) {
        if (!error) {
            var $ = cheerio.load(html);

            var title = "",
                authors = "",
                License = "",
                download_url = "",
                datemod = "",
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
                datemod: "",
                License: "",
                download_url: "",
                project_url: "",
                description: "",
                image: "",
                thumb: "",
                original_url: "",
                short_title: ""
            };

            json.type = "hardware";
            json.project_url = url;
            json.original_url = url;
                        
            //Sneaky. This may get pulled in the future! The below is left in the comments just incase
            $('a.repin.space-right').filter(function() {
                var data = $(this);
                var pinshape_JSON = JSON.parse(data.attr("data-id"));

               json.title= pinshape_JSON.name;
               // Get the short_title. Equally important
               // All short_titles should be the title shortened and ready for files
               var short_title = json.title.toLowerCase();
               // \W is any non-word char (e.g. ! a-ZA-X0-9_
               var rexp = /([\W]+)/ig;
               json.short_title = short_title.replace(rexp, '_');

               json.download_url = pinshape_JSON.zip_file.url;
               json.License =  pinshape_JSON.usage_license;


               $('div.designed-by a').filter(function() {
                   var data = $(this);
                   authors = data.text().trim();
                   json.authors = authors;
               })

               json.datemod =  moment(pinshape_JSON.updated_at).format("YYYY-MM-DD HH:mm"); 
               json.project_url =  url;
               json.description = toMarkdown(pinshape_JSON.description);
               json.original_url =  url;
            })
            
            $('a.button-download').filter(function() {
                var data = $(this);
                download_url = url + data.attr("href");
                json.download_url = download_url;
            })

            /*               
              
            $('title').filter(function() {
                var data = $(this);
                title = data.text().trim();

            })
            if (title == undefined || title == '' || title == '404') {
                title = 'pinshape - Page not found';
                enable_download = 0;
                res.json({ error: "page not found"});
                return;
            }
            var rexp = /( by)([a-zA-Z0-9-|()! ]+)+( Pinshape)/ig;
            title = title.replace(rexp, ' ');
            json.title = title.trim();



            $('a[rel=nofollow]').each(function(index, item) {

                if (item.attribs['href'].includes("license")) {
                    License = item.children[0].data;
                }
            });
            if (License != undefined && License != '') {
                json.License = License;
            }


            $("meta[name='description']").filter(function() {
                    var data = $(this);
                    description = data.attr("content");
                    json.description = description;
                })
                /*
                var img_url = $("div.article-image img").first();
                if (img_url == undefined || img_url == "") {
                    img_url = $('img').first();
                }
                image = img_url.attribs['data-cfsrc'];
                json.image = image;
                image_download = 'http:' + image;
                */

            $("div.article-image img").first().filter(function() {
                var data = $(this);
                image = data[0].attribs['data-cfsrc'];

            })
            if (image == undefined || image == "") {
                var img_url = $('img').first();
                image = img_url.attr("src");
            }
            json.image = image;
            image_download = 'http:' + image;
            if (image != undefined && image != "") {
                json.image = "images/" + json.short_title + ".png";
                json.thumb = "images/" + json.short_title + "-thumb.png";
                json.image_download = image_download;
            }
            /*
            $("p.description").filter(function() {
                var data = $(this);
                main_description = toMarkdown(data.siblings('meta').attr("content"));
                json.main_description = main_description;
            })
            */
        }
        res.json(json);

    })
};