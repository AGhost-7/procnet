
var reqFactory = require('./lib/httpReqFactory');
var serverFactory = require('./lib/httpServerFactory');

var secureReqFactory = require('./lib/httpsReqFactory');
var secureServerFactory = require('./lib/httpsServerFactory');
var pogo = require('pogostick-proto');

module.exports = {
	client: function(promiseFactory, options) {
		return pogo.client(promiseFactory, reqFactory, options);
	},
	server: function(options) {
		return pogo.server(serverFactory, options);
	},
	https: {
		client: function(promiseFactory, options) {
			return pogo.client(promiseFactory, secureReqFactory, options);
		},
		server: function(options) {
			return pogo.server(secureServerFactory, options);
		}
	}
};
