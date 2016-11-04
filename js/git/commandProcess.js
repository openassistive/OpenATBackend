'use strict';

exports.series = function(cmds, callback) {
    var execNext = function() {
        exports.exec(cmds.shift(), function(error) {
            if (error) {
                callback(error);
            } else {
                if (cmds.length) execNext();
                else callback(null);
            }
        });
    };
    execNext();
};