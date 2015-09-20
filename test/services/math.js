var procnet = require('../../index');

module.exports = procnet.service(function() {
	return {
		add: function(a, b) {
			return a + b;
		},
		multiply: function(a, b) {
			return a * b;
		}
	};
});
