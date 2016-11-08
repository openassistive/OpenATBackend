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
                original_url: ""
            };

            json.type = "hardware";
            json.project_url = url;
            json.original_url = url;
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
            $('div.designed-by a').filter(function() {
                var data = $(this);
                authors = data.text().trim();
                json.authors = authors;
            })
            $('a[rel=nofollow]').each(function(index, item) {

                if (item.attribs['href'].includes("license")) {
                    License = item.children[0].data;
                }
            });
            if (License != undefined && License != '') {
                json.License = License;
            }
            $('a.button-download').filter(function() {
                var data = $(this);
                download_url = url + data.attr("href");
                json.download_url = download_url;
            })


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
                var re = /[\w* ]+/i;
                var title_img = re.exec(title)[0];
                if (title_img == undefined || title_img == '') {
                    title_img = 'pinshape';
                }
                title_img = title_img.toLowerCase().trim();
                var patt1 = /\s/g;
                title_img = title_img.replace(patt1, '_');
                json.image = "images/full/" + title_img;
                json.thumb = "images/thumb/" + title_img;
                if (enable_download > 0) {
                    contentCreator.SaveImages(image_download, './download_image/' + title_img);
                }

            }
            $("p.description").filter(function() {
                var data = $(this);
                main_description = toMarkdown(data.siblings('meta').attr("content"));
                json.main_description = main_description;
            })
        }
        fs.writeFile('./output/' + title_img + '.md', contentCreator.createMDFile(json), function(err) {
            console.log('MDFile created successfully!');
        });

        res.json(json);

    })
};