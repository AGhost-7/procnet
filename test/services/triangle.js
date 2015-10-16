var procnet = require('../../index');


module.exports = procnet.service(['math'], function(math) {
	return {
		surface: function(w, h){
			return math.multiply(w, h).then(function(res) {
				return math.divide(res, 2);
			});
		}
	};
});
