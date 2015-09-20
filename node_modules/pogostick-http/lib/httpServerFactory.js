var http = require('http');
var serverFactory = require('./serverFactory');
module.exports = serverFactory(http);

