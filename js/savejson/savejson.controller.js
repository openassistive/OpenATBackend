'use strict';
var request = require('request');
var contentCreator = require('../functions');
const util = require('../util')
const schema = require('validate')
const _ = require('lodash')
const sanitizeHtml = require('sanitize-html')
const url = require('url')

const saveValidator = schema(Object.assign(
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
    },
    license: {
      type: 'string',
      message: 'license should be a string'
    },
    tags: {
      use: [ function(value) {
        if(value == null)
          return true;
        return Array.isArray(value) &&
          value.filter((s) => typeof s != 'string' || s.length==0).length == 0;
      }, 'tags should be an array of non-empty string' ],
      required: 'tags is required'
    }
  },
  _.fromPairs(
    [ "title", "short_title", "authors", "main_description" ]
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
    [ "project_url", "original_url",
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
      }))
));
const readonlyProps = ['date']

exports.saveJSON = function(req, res) {

   if (!req.body){
    console.log('no body');
    return res.sendStatus(400);
   }

   var json = req.body;

   var errors = saveValidator.validate(json)

   if(errors.length > 0) {
     return res.json({ error: errors[0].message });
   }

   // prevent abuse with html tags, <script injection>
   json.main_description = sanitizeHtml(json.main_description)

   // convert dates
   json.datemod = util.dateISOString(Date.parse(json.datemod))
  
   let itemFn = 'content/item/'+json.short_title + '.md';
  
   // assuming `date' is readonly, It's the save time if overwriting then
   // get date from existing file
   contentCreator.readItemFromGithub(itemFn)
     .then((resp) => {
       for(let prop of readonlyProps)
         json[prop] = resp.fm[prop];
       save();
     })
     .catch((err) => {
       console.error(err); // log for debugging
       // current time
       json.date = util.dateISOString(new Date());
       save();
     });

   function save() {
     // we need to write to GitHub - not just download
     // need to fix tags - maybe in the generateMDFile function
     if (json.image_download){
       console.log('about to save the images..');
       contentCreator.SaveImagesToGitHub(json.image_download, json.short_title, 'static/files/images/');
     }
     
     contentCreator.writeDataToGithub(contentCreator.generateMDFile(json), itemFn, function (err) {
       if (err) throw err
       console.log('It\'s saved!')
       return res.json({success: json.short_title});
     });
   }

};
