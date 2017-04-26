'use strict';
var request = require('request');
var contentCreator = require('../functions');
const util = require('../util')
const schema = require('validate')
const _ = require('lodash')
const sanitizeHtml = require('sanitize-html')
const url = require('url')
const crypto = require('crypto')

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
const readonlyProps = ['date', 'thumb', 'image', 'image_download_sha'];

exports.saveJSON = function(req, res) {

  if (!req.body){
    console.log('no body');
    return res.sendStatus(400);
  }
  
  var itemFn,
      _json = req.body,
      json = _.assign({}, _json),
      relayed_by_ip = (req.headers['x-forwarded-for'] ?
                       req.headers['x-forwarded-for'] :
                       req.connection.remoteAddress);

  var recaptcha_resp = _json['g-recaptcha-response'];
  if(!recaptcha_resp)
    return res.json({ error: "No recaptcha response!" });
  request.post("https://www.google.com/recaptcha/api/siteverify", {
    form: {
      secret: process.env.RecaptchaSecret,
      response: recaptcha_resp,
      remoteip: relayed_by_ip
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

    itemFn = 'content/item/'+json.short_title + '.md';

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
        if(err.status != 404 && err.message != 'File not found') {
          console.error(`Error on readItemFromGithub(${itemFn})`);
          console.error(err); // log for debugging
        }
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
    json.relayed_by_ip = relayed_by_ip;

    if(_json.dryrun) {
      return res.json({ "savedata": json });
    }

    var changes = [];
    
    contentCreator.downloadFileToBuffer(json.image_download)
      .then(function(imagedata) {
        var sha = crypto.createHash('sha256').update(imagedata).digest().toString('hex');
        if(json.image_download_sha != sha) { // add images
          json.image_download_sha = sha;
          return contentCreator.createItemImages(imagedata)
            .then(function(resp) { // response has png images
              var images_dir = 'static/files/images/',
                  images_site_path = 'images/'
              if(resp.thumb) {
                var name = json.short_title + '-thumb.png';
                changes.push({
                  content: resp.thumb.toString('base64'),
                  encoding: 'base64',
                  path: images_dir + name
                });
                json.thumb = images_site_path + name
              }
              if(resp.image) {
                var name = json.short_title + '.png';
                changes.push({
                  content: resp.image.toString('base64'),
                  encoding: 'base64',
                  path: images_dir + name
                });
                json.thumb = images_site_path + name
              }
            })
        }
      })
      .then(() => { // final step
        changes.push({
          content: contentCreator.generateMDFile(json),
          encoding: 'utf-8',
          path: itemFn
        });
        console.log("commitChangesToGithub");
        return contentCreator
          .commitChangesToGithub('master', `Update item ${json.short_title}`,
                                 changes);
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
