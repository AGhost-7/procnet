var https = require('https');
var serverFactory = require('./serverFactory');

module.exports = serverFactory(https);
