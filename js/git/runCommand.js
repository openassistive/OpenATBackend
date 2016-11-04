'use strict';
var myProcessor = require('./commandProcess');

exports.runCommands = function() {
    myProcessor.series([
        'cd ~/Documents',
        'touch hahah.aa'

    ], function(err) {
        console.log('executed many commands in a row');
    });
}