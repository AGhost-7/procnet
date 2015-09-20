var procnet = require('../index');
var expect = require('chai').expect;

describe('configuration parser', function() {
	var config = {
		http: {
			math: { port: 9000 }
		}
	};

	var flat = procnet._flattenConfig(config);
	
	it('should apply the service type', function() {
		expect(flat.math._serviceType).to.equal('http');
	});

	it('should inherit the configurations', function() {
		expect(flat.math.port).to.equal(9000);
	});
});
