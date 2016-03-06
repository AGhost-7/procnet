var procnet = require('../../index');

module.exports = procnet.injectable(function() {
	return {
		add: function(a, b) {
			return a + b;
		},
		multiply: function(a, b) {
			return a * b;
		},
		divide: function(a, b) {
			return a / b;
		}
	};
});
