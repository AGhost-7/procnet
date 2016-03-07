var procnet = require('../../index');

module.exports = procnet.service(function(rectangle, triangle) {
	return {
		rectangle: function(w, h) {
			return rectangle.surface(w, h).then(function(res) {
				return 'The rectangle has a surface of: ' + res;
			});
		},
		triangle: function(w, h) {
			return triangle.surface(w, h).then(function(res) {
				return 'The triangle has a surface of: ' + res;
			});
		}
	};
});
