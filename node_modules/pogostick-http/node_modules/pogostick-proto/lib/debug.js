
'use strict';

var debug = require('debug');

// Return an expanded json object, for better readability when it comes to
// large objects.
debug.formatters.e = function(val) {
	return JSON.stringify(val, null, '\t');
};

module.exports = debug('pogostick-proto');
