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

  // with initial content validation
  
  request({url: req.projectUrl, encoding: 'utf8'}, function(err, resp, body) {
    if(err) {
      res.status(422).json({ error: "Could not open requested url" })
    }
    var item, data, tmp;
    try {
      // parse data
      item = util.parseItem(body);
      data = Object.assign({}, item.fm, {
        main_description: item.content
      });
    } catch(err) {
      res.status(422).json({ error: "Content has invalid format" })
      return;
    }

    // validate
    let errors = dataValidator.validate(data);
    if(errors.length > 0) {
      return res.status(422).json({ error: errors[0].message });
    }

    // make it ready for save
    // short_title from title
    data.short_title = contentCreator.genShortTitle(data.title);
    
    data.original_url = req.projectUrl;
    
    [ 'categories', 'tags' ].forEach((name) => {
      if(!Array.isArray(data[name]))
        data[name] = [];
    });

    if(data.image) {
      data.image_download =
        url.resolve(req.projectResolveUrl || req.projectUrl, data.image)
      delete data.image
    }

    // success
    res.json(data);
  });
  
};
