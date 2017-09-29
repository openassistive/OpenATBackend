const _ = require('lodash')
const csv = require('csv')
const contentCreator = require('../functions')
const duplexer2 = require('duplexer2')

exports.filePath = 'items_index.csv';
exports.updateEvery = 1 * 60 * 1000;

/* items_index.csv definition
 * short_title, project_link
 */
const itemsIndexFields = {
  short_title: 0,
  project_url: 1,
  exists: 2,
  unmoderated: 3
};
const itemsIndexFieldsEncode = {
  exists: (v) => v ? "1" : "0",
  unmoderated: (v) => JSON.stringify(v)
};
const itemsIndexFieldsDecode = {
  exists: (v) => v == "1",
  unmoderated: (v) => v ? JSON.parse(v) : []
};
const itemsIndexFieldKeys = Object.keys(itemsIndexFields);
const itemsIndexFieldsLength = itemsIndexFieldKeys.length;

function mkrow(item) {
  let row = [];
  for(let field in itemsIndexFields) {
    if(!(field in item))
      throw new Error(`Cannot index item \`${field}\` does not exists`);
    let v = item[field];
    if(itemsIndexFieldsEncode[field])
      v = itemsIndexFieldsEncode[field](v);
    row[itemsIndexFields[field]] = v;
  }
  return row;
}

/** @brief modify items_index.csv content
 *  @param items changes to perform (short_title is the identifier)
 *  @return transform stream
 */
exports.performChangesTransform = function(changes, cmp) {
  changes = changes.concat();
  let editcsv = csv.transform((record) => {
    // validate
    if(record.length != itemsIndexFieldsLength ||
       !record[itemsIndexFields.short_title]) {
      // invalid record remove it
      return null;
    } else {
      let short_title = record[itemsIndexFields.short_title];
      let project_url = record[itemsIndexFields.project_url];
      let idx = changes.findIndex((c) => c.item.short_title == short_title ||
                                         c.item.project_url == project_url);
      if(idx != -1) {
        let change = changes.splice(idx, 1)[0];
        if(change.task == 'upsert')
          return mkrow(change.item); // replace
        else if(change.task == 'delete')
          return null;
      }
      return record;
    }
    return null;
  })
  let outcsv = csv.stringify();
  let parser = csv.parse();
  editcsv.on('end', function() {
    // add remaining
    var change;
    while(change = changes.shift()) {
      if(change.task == 'upsert')
        outcsv.write(mkrow(change.item));
    }
    outcsv.end()
  });
  parser.pipe(editcsv).pipe(outcsv, { end: false });
  return duplexer2(parser, outcsv);
}

/* for now index in a dict and update on interval limit
 */
let lastUpdate = 0, // zero means no data
    rowsByShortTitle = {},
    rowsByProjectUrl = {},
    prepareForSearchPromise;
function prepareForSearch() {
  if(prepareForSearchPromise)
    return prepareForSearchPromise;
  if(new Date().getTime() - exports.updateEvery > lastUpdate) {
    return prepareForSearchPromise =
      contentCreator.readFromGithub(exports.filePath)
      .then((data) => {
        return new Promise((resolve, reject) => {
          rowsByShortTitle = {};
          rowsByProjectUrl = {};
          let parser = csv.parse(),
              cancel = false;
          parser.on('error', (err) => {
            cancel = true;
            delete prepareForSearchPromise;
            reject(err);
          });
          parser.on('readable', () => {
            var record;
            while(record = parser.read()) {
              if(record.length != itemsIndexFieldsLength ||
                 !record[itemsIndexFields.short_title]) // skip invalid
                continue;
              rowsByShortTitle[record[itemsIndexFields.short_title]] = record;
              if(record[itemsIndexFields.project_url])
                rowsByProjectUrl[record[itemsIndexFields.project_url]]= record;
            }
          });
          parser.on('end', () => {
            if(!cancel) {
              lastUpdate = new Date().getTime()
              delete prepareForSearchPromise;
              resolve();
            }
          });
          parser.write(data);
          parser.end();
        });
      })
      .catch((err) => { // skip not found
        delete prepareForSearchPromise;
        if(err.status != 404 && err.message != 'File not found')
          throw err;
      });
  } else {
    return Promise.resolve();
  }
}

function itemFromRow(row) {
  if(!row)
    return null
  if(!row._parsed)
    row._parsed = _.fromPairs(
      itemsIndexFieldKeys.map(
        (f) => [ f,
                 itemsIndexFieldsDecode[f] ?
                   itemsIndexFieldsDecode[f](row[itemsIndexFields[f]]) :
                   row[itemsIndexFields[f]] ]
      )
    );
  return row._parsed;
}

exports.updateMemPool = function(changes) {
  return prepareForSearch()
    .then(() => {
      for(let change of changes) {
        let item = change.item;
        if(change.task == 'upsert') {
          let record = mkrow(item)
          record._parsed = item;
          if(item.short_title)
            rowsByShortTitle[item.short_title] = record;
          if(item.project_url)
            rowsByProjectUrl[item.project_url] = record;
        } else if(change.task == 'delete') {
          if(item.short_title)
            delete rowsByShortTitle[item.short_title];
          if(item.project_url)
            delete rowsByProjectUrl[item.project_url];
        }
      }
    });
}

exports.searchByShortTitle = function(short_title) {
  return prepareForSearch()
    .then(() => itemFromRow(rowsByShortTitle[short_title]));
}

exports.searchByProjectUrl = function(project_url) {
  return prepareForSearch()
    .then(() => itemFromRow(rowsByProjectUrl[project_url]));
}

exports.searchForItem = function(input) {
  return prepareForSearch()
    .then(() => {
      let tmp = input.short_title ? rowsByShortTitle[input.short_title] : null;
      if(!tmp)
        tmp = input.project_url ? rowsByProjectUrl[input.project_url] : null;
      return itemFromRow(tmp)
    });
}
