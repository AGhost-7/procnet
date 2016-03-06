var procnet = require('../../index');


module.exports = procnet.service(['math'], function(math) {
	return {
		surface: function(w, h){
			return math.divide(math.multiply(w, h), 2);
		}
	};
});
