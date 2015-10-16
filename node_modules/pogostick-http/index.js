/* global require,module */
'use strict';

var pogot = require('pogostick-proto');
var serverFactory = require('./lib/serverFactory');
var reqFactory = require('./lib/reqFactory');

var pogo = require('pogostick-proto');

module.exports = {
	client: function(promiseFactory, options) {
		return pogo.client(promiseFactory, reqFactory.http, options);
	},
	server: function(options) {
		return pogo.server(serverFactory.http, options);
	},
	https: {
		client: function(promiseFactory, options) {
			return pogo.client(promiseFactory, reqFactory.https, options);
		},
		server: function(options) {
			return pogo.server(serverFactory.https, options);
		}
	},
	exit: pogo.exit
};
