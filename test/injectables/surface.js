var procnet = require('../../index');

module.exports = procnet.service([
	'rectangle', 
	'triangle'
], function(rectangle, triangle) {
	return {
		rectangle: function(w, h) {
			return 'The rectangle has a surface of: ' + rectangle.surface(w, h);
		},
		triangle: function(w, h) {
			return 'The triangle has a surface of: ' + triangle.surface(w, h);
		}
	};
});
