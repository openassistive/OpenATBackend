const csv = require('csv')
const contentCreator = require('../functions');

exports.filePath = 'items_index.csv';
exports.updateEvery = 1 * 60 * 1000;

/* items_index.csv definition
 * short_title, project_link
 */
const itemsIndexFields = {
  short_title: 0,
  project_link: 1
};
const itemsIndexFieldsLength = Object.keys(itemsIndexFields).length;

/** @brief modify items_index.csv content
 *  @param items changes to perform (short_title is the identifier)
 *  @return Duplex stream
 */
exports.performChangesDuplex = function(items) {
  items = items.concat();
  let items_map = _.fromPairs(
    items.map((item, index) => [ item.short_title, index ])
  );
  let editcsv = csv.transform((record) => {
    // validate
    if(record.length != itemsIndexFieldsLength ||
       !record[itemsIndexFields.short_title]) {
      // invalid record remove it
      return null;
    } else {
      let idx = items_map[record[itemsIndexFields.short_title]];
      if(idx !== undefined)
        return items.splice(idx, 1)[0]; // replace
    }
  })
  let outcsv = csv.stringify()
  editcsv.on('end', function() {
    // add remaining
    while(items.length > 0)
      outcsv.write(items.shift())
    outcsv.end()
  });
  return csv.parse()
    .pipe(editcsv)
    .pipe(outcsv, { end: false });
}

/* for now index in a dict and update on interval limit
 */
let lastUpdate = 0, // zero means no data
    itemsByShortTitle = {},
    itemsByProjectUrl = {};
function prepareForSearch() {
  if(new Date().getTime() - exports.updateEvery > lastUpdate) {
    return contentCreator.readFromGithub(exports.filePath)
      .then((data) => {
        return new Promise((resolve, reject) => {
          itemsByShortTitle = {};
          itemsByProjectUrl = {};
          let parser = csv.parser(),
              cancel = false;
          parser.on('error', (err) => {
            cancel = true;
            reject(err);
          });
          parser.on('readable', () => {
            var record;
            while(record = parser.read()) {
              if(record.length != itemsIndexFieldsLength ||
                 !record[itemsIndexFields.short_title]) // skip invalid
                continue;
              itemsByShortTitle[record[itemsIndexFields.short_title]] = record;
              itemsByProjectUrl[record[itemsIndexFields.project_url]] = record;
            }
          });
          parser.on('end', () => {
            if(!cancel)
              resolve();
          });
          parser.write(data);
          parser.end();
        });
      })
      .catch((err) => { // skip not found
        if(err.status != 404 && err.message != 'File not found')
          throw err;
      });
  } else {
    return Promise.resolve();
  }
}

exports.searchByShortTitle = function(short_title) {
  return prepareForSearch()
    .then(() => itemsByShortTitle[short_title]);
}

exports.searchByProjectUrl = function(project_url) {
  return prepareForSearch()
    .then(() => itemsByProjectUrl[project_url]);
}

exports.searchForItem = function(input) {
  return prepareForSearch()
    .then(() => {
      let tmp = input.short_title ?
                   itemsByShortTitle[input.short_title] : null;
      if(!tmp)
        tmp = input.project_url ?
                   itemsByProjectUrl[input.project_url] : null;
      return tmp;
    });
}
