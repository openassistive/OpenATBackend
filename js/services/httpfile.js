'use strict';
const request = require('request')
const util = require('../util')
const schema = require('validate')
const url = require('url')
const _ = require('lodash')
const contentCreator = require('../functions')

const dataValidator = schema(Object.assign(
  {
    datemod: {
      type: 'string',
      use: function(value) {
        if(value == null)
          return true;
        return Date.parse(value) != null;
      },
      required: 'datemod is required',
      message: 'datemod should be a valid date'
    }
  },
  _.fromPairs(
    [ "license", "image" ]
      .map((n) => { // optional string
        return [ n, {
          type: 'string',
          message: n + ' should be a string'
        } ];
      })),
  _.fromPairs(
    [ "title", "authors", "main_description", "description" ]
      .map((n) => { // required string
        // main_description should get sanitized after this validation
        return [ n, {
          type: 'string',
          required: n + ' is required',
          message: n + ' should be a string'
        } ];
      })
  ),
  _.fromPairs(
    [ "project_url", 
      { n: "download_url", r: false }, { n: "image_download", r: false } ]
      .map((n) => { // required url
        var required = true;
        if(typeof n == 'object') {
          required = n.r;
          n = n.n;
        }
        return [ n, {
          type: 'string',
          required: required ? n + ' is required' : false,
          use: function(value) {
            if(value == null)
              return true;
            var uobj = url.parse(value) // should have valid protocol and host
            return [ 'http:', 'https:' ].indexOf(uobj.protocol) != -1 &&
              !!uobj.host;
          },
          message: n + ' should be a valid url'
        } ];
      })
  ),
  _.fromPairs(
    [ 'tags', 'categories' ]
      .map((n) => { // optional array of string
        return [ n, {
          use: [ function(value) {
            if(value == null)
              return true;
            return Array.isArray(value) &&
              value.filter((s) => typeof s != 'string' || s.length==0).length == 0;
          }, n + ' should be an array of non-empty string' ]
        } ];
      })
  )
));

exports.handler = function(req, res, next) {
  // a helper for other services to get access for download requests
  let urldlf = req.url_dl_filter || function (s) { return s; };
  let ourl = urldlf(req.projectUrl)
  
  request({url: ourl, encoding: 'utf8'}, function(err, resp, body) {
    if(err) {
      res.status(422).json({ error: "Could not open requested url" })
    } else {
      try {
        // parse item
        let item = util.parseItem(body);
        exports.handler_step2(item, req, res, next);
      } catch(err) {
        res.status(422).json({ error: "Content has invalid format" })
        return;
      }
    }
  });
}

exports.handler_step2 = function(item, req, res, next) {

  // a helper for other services to get access for download requests
  let urldlf = req.url_dl_filter || function (s) { return s; };
  let ourl = urldlf(req.projectUrl)
  
  // with initial content validation

  let data = Object.assign({}, item.fm, {
    main_description: item.content
  });

  // validate
  let errors = dataValidator.validate(data);
  if(errors.length > 0) {
    return res.status(422).json({ error: errors[0].message });
  }

  // make it ready for save
  // short_title from title
  data.short_title = contentCreator.genShortTitle(data.title);
  
  data.original_url = req.originalUrl || req.projectUrl;
  
  [ 'categories', 'tags' ].forEach((name) => {
    if(!Array.isArray(data[name]))
      data[name] = [];
  });

  if(data.image) {
    data.image_download = 
      url.resolve(req.projectResolveUrl || req.projectUrl, data.image);
    delete data.image;
  }

  if(data.image_download)
    data.image_download = urldlf(data.image_download)

  // success
  res.json(data);
}
