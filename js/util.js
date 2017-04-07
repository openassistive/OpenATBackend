const yamljs = require("yamljs")

function prefixFixedString(str, fill, num) {
  str = str+'';
  return fill.repeat(Math.floor((num - str.length) / fill.length)) + str;
}

module.exports = {
  parseItem: (data) => {
    var lines = data.split(/\r\n|\n/g);
    // parse yamljs
    var firstIdx = lines.indexOf('---'),
        secondIdx = lines.indexOf('---', firstIdx + 1);
    if(firstIdx != 0 || secondIdx <= firstIdx) 
      throw new Error("Invalid format");
    return {
      data: data,
      fm: yamljs.parse(lines.slice(0, secondIdx).join('\n')),
      content: lines.slice(secondIdx + 1).join('\n')
    };
  },
  dateISOString: (d) => {
    return d.getUTCFullYear() +
      '-' + prefixFixedString(d.getUTCMonth() + 1, '0', 2) +
      '-' + prefixFixedString(d.getUTCDate(), '0', 2) +
      'T' + prefixFixedString(d.getUTCHours(), '0', 2) +
      ':' + prefixFixedString(d.getUTCMinutes(), '0', 2) +
      ':' + prefixFixedString(d.getUTCSeconds(), '0', 2) +
        'Z';
  }
};
