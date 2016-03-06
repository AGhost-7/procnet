var procnet = require('../index');
var expect = require('chai').expect;

function autorequire(items) {
	return Object.keys(items).reduce(function(accu, name) {
		if(typeof items[name] === 'string') {
			accu[name] = require(items[name]);
		} else {
			accu[name] = items[name];
		}
		return accu;
	}, {});
}

describe('procnet for dependency injection', function() {
	describe('resolve', function() {

		it('should load single items', function() {
			var reqd = autorequire({
				'math': './injectables/math'
			});
			var loaded = procnet.resolve(reqd);
			expect(loaded.math).to.be.a('object');
			expect(loaded.math.add).to.be.a('function');
		});
		it('should load cross-dependencies', function() {
			var services = autorequire({
				'rectangle': './injectables/rectangle',
				'triangle': './injectables/triangle',
				'surface': './injectables/surface',
				'math': './injectables/math'
			});

			var loaded = procnet.resolve(services);
			expect(loaded.surface).to.not.have.property('@@service');
			expect(loaded.surface.rectangle(2, 2)).to.equal('The rectangle has a surface of: 4');
		});
		it('should allow pre-loaded items', function() {
			var injectables = autorequire({
				'math': require('./injectables/math')(),
				'rectangle': './injectables/rectangle'
			});
			var loaded = procnet.resolve(injectables);
			expect(loaded.rectangle).to.not.have.property('@@service');
		});
	});
});
