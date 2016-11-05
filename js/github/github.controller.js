'use strict';
var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var contentCreator = require('../functions');
var toMarkdown = require('to-markdown');

exports.scrape_Github = function(req, res) {

    //var url = 'http://www.github.com/' + req.params.id + '/' + req.params.url;
    var url = 'http://www.github.com';
    var reponame = "github";
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
                res.send("Sorry, Page not found");
                return;
            }
            var rexp = /( by)([a-zA-Z0-9-|()! ]+)+( Github)/ig;
            title = title.replace(rexp, ' ');
            json.title = title.trim();
            json.authors = $('span.author').text().trim();

            License = $('h1:contains("License")').first().next('p').text();

            if (License == '' || License == undefined) {
                License = $('h2:contains("License")').first().next('p').text();
            }
            if (License == '' || License == undefined) {
                License = $('h3:contains("License")').first().next('p').text();
            }

            json.License = License;
            console.log($('a[name=user-content-license]').next().next().text());
            json.datemod = $('span[itemprop=dateModified]').text().trim();

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
                image_download = image;
                if (enable_download > 0) {
                    contentCreator.download(image_download, './download_image/' + title_img, function() {
                        console.log('done');
                    });
                }

            }

        }

        fs.writeFile('./output/' + title_img + '.md', contentCreator.createMDFile(json), function(err) {
            console.log('MDFile created successfully!');
        });
        fs.writeFile('./output/output_github.json', JSON.stringify(json, null, 4), function(err) {
            console.log('File successfully written! - Check your project directory for the output.json file');
        })


        res.send(url);
    })
};