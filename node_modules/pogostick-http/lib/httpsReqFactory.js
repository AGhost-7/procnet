var https = require('https');
var reqFactory = require('./reqFactory');

module.exports = reqFactory(https);

