var procnet = require('../../index');
var Promise = require('bluebird');

module.exports = procnet.injectable(function(math, rectangle) {
	return new Promise(function(resolve) {
		resolve({
			add: math.add
		});
	});
});

