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
    }
  },
  _.fromPairs(
    [ "title", "short_title", "authors", "main_description", "description" ]
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
      })
  ),
  _.fromPairs(
    [ 'tags', 'categories' ]
      .map((n) => { // required string
        // main_description should get sanitized after this validation
        return [ n, {
          use: [ function(value) {
            if(value == null)
              return true;
            return Array.isArray(value) &&
              value.filter((s) => typeof s != 'string' || s.length==0).length == 0;
          }, n + ' should be an array of non-empty string' ],
          required: n + ' is required'
        } ];
      })
  )
));
const readonlyProps = ['date', 'thumb', 'image'];

exports.saveJSON = function(req, res) {

  if (!req.body){
    console.log('no body');
    return res.sendStatus(400);
  }

  var _json = req.body,
      json = _.assign({}, _json);

  var recaptcha_resp = _json['g-recaptcha-response'];
  if(!recaptcha_resp)
    return res.json({ error: "No recaptcha response!" });
  request.post("https://www.google.com/recaptcha/api/siteverify", {
    form: {
      secret: process.env.RecaptchaSecret,
      response: recaptcha_resp,
      remoteip: req.connection.remoteAddress
    }
  }, (err, resp, body) => {
    try {
      if(err)
        throw err;
      var respdata = JSON.parse(body);
      if(!respdata)
        throw new Error("Could not parse response");
      if(respdata.success)
        step1();
      else
        throw new Error("Invalid response");
    } catch(err) {
      res.json({ error: "Recaptcha error: " + (err?err.message||err:'undefined') });
    }
  })
  
  function step1() {
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
        for(let prop of readonlyProps) {
          if(resp.fm[prop])
            json[prop] = resp.fm[prop];
          else
            delete json[prop];
        }
        save();
      })
      .catch((err) => {
        console.error(err); // log for debugging
        save();
      });
  }
  
  function save() {

     // set initial value on null
     if(!json.date) // current time
       json.date = util.dateISOString(new Date());

    // tags should be an array overwrite if it's not
    for(let f of ['tags','categories'])
      if(!Array.isArray(json[f]))
        json[f] = [];
    
    // on save set as un-moderated (no matter what is the input)
    json.moderated = false;
    json.tags.push("un-moderated");

    // set remoteip
    json.relayed_by_ip = req.connection.remoteAddress;

    if(_json.dryrun) {
      return res.json({ "savedata": json, "headers": req.headers });
    }
    
    var promises = [];
    
     // we need to write to GitHub - not just download
     // need to fix tags - maybe in the generateMDFile function
     if (json.image_download){
       console.log('about to save the images..');
       promises.push(
         contentCreator.SaveImagesToGitHub(json.image_download, json.short_title, 'static/files/images/')
           .then(function(resp) {
             if(resp.thumb)
               json.thumb = 'images/' + resp.thumb;
             if(resp.image)
               json.image = 'images/' + resp.image;
           })
       );
     }

    Promise.all(promises)
      .then(() => {
        return contentCreator
          .writeDataToGithub(contentCreator.generateMDFile(json), itemFn)
      })
      .then(() => {
        console.log('It\'s saved!')
        return res.json({success: json.short_title});
      })
      .catch((err) => {
        res.json({error: "Internal error!\n"+(err.stack||err)});
        if (err)
          console.error(err);
      });
  }

};
