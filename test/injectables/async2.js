
var procnet = require('../../index');
var Promise = require('bluebird');

module.exports = procnet.injectable(function(async) {
	return new Promise(function(resolve) {
		resolve({
			add: async.add
		});
	});
});

