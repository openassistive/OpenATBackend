'use strict';
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var contentCreator = require('../functions');
var toMarkdown = require('to-markdown');

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
    console.log(url);

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
                res.send("Sorry, Page not found");
                return;
            }
            var rexp = /( by)([a-zA-Z0-9-|()! ]+)+( Instructables)/ig;
            title = title.replace(rexp, ' ');
            json.title = title.trim();
            json.License = $('section#project-categories-and-license section.content a').text().trim();
            json.datemod = $('meta[itemprop=datePublished]').attr('content');
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
            json.download_url = $('div.pull-left a#download-pdf-btn-top').attr('data-return-url');


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
                var re = /[\w* ]+/i;
                var title_img = re.exec(title)[0];
                if (title_img == undefined || title_img == '') {
                    title_img = 'instructables';
                }
                title_img = title_img.toLowerCase().trim();
                var patt1 = /\s/g;
                title_img = title_img.replace(patt1, '_');

                json.image = "images/full/" + title_img;
                json.thumb = "images/thumb/" + title_img;
                if (enable_download > 0) {
                    contentCreator.download(image_download, './download_image/' + title_img, function() {
                        console.log('done');
                    });
                }

            }

            $("p.description").filter(function() {
                var data = $(this);
                description = data.text();

                json.description = description;
            })
        }

        fs.writeFile('./output/' + title_img + '.md', contentCreator.createMDFile(json), function(err) {
            console.log('MDFile created successfully!');
        });
        fs.writeFile('./output/output_Instructables.json', JSON.stringify(json, null, 4), function(err) {
            console.log('File successfully written! - Check your project directory for the output.json file');
        })

        res.send(url);
    })
};