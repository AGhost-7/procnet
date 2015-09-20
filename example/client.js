var procnet = require('../index');
var pogo = require('pogostick-http');
var Promise = require('bluebird');

var promiseFactory = function(res) { return new Promise(res); };
var mkRemote = pogo.client(promiseFactory);
var mkClient = procnet.client(mkRemote);

mkClient(['math',]
