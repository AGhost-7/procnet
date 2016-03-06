
var procnet = require('../../index');

module.exports = procnet.service(['math'], function(math) {
	return {
		surface: function(w, h) {
			return math.multiply(w, h);
		},
		perimeter: function(w, h) {
			return math.add(math.multiply(w, 2), math.multiply(h, 2));
		}
	};
});
