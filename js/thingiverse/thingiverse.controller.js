'use strict';
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var http = require('http');
var contentCreator = require('../functions');

var image_download = "";

exports.scrape_Thingiverse = function(req, res) {
    var url = 'http://www.thingiverse.com'; // + req.params.id; // + '/' + req.params.url;
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
                original_url: "",
                image_download: ""
            };

            json.type = "hardware";
            json.project_url = url;
            json.original_url = url;
            json.title = $('title').text().trim();
            if (json.title == undefined || json.title == '') {
                json.title = 'thingiverse - Page not found';
                enable_download = 0;
            }

            json.License = $('div.thing-license').first().attr('title');
            json.datemod = $('div.thing-header-data time').attr('datetime');
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
            json.download_url = $('a.thing-download-btn').attr('href');


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
                var re = /[\w* ]+/i;
                var title_img = re.exec(json.title)[0];
                if (title_img == undefined || title_img == '') {
                    title_img = 'thingiverse';
                }
                title_img = title_img.toLowerCase();
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
            $("div.description").filter(function() {
                var data = $(this);
                main_description = data.text();

                json.main_description = main_description;
            })
        }

        fs.writeFile('./md/thingiverse.md', contentCreator.createMDFile(json), function(err) {
            console.log('MDFile created successfully!');
        });
        fs.writeFile('./json/output_thingiverse.json', JSON.stringify(json, null, 4), function(err) {
            console.log('File successfully written! - Check your project directory for the output.json file');
        })

    });


};