var procnet = require('../index');

module.exports = procnet.service(['math'], function(math) {
	return {
		surface: function(w, h) {
			return math.multiply(w, h);
		},
		perimeter: function(w, h) {
			return Promise.all([
				math.multiply(w, 2),
				math.multiply(h, 2)
			]).spread(function(m1, m2) {
				return math.add(m1, m2);
			});
		}
	};
});
