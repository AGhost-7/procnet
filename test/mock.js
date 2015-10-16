/* jshint expr: true */

var Promise = require('bluebird');
var expect = require('chai').expect;
var procnet = require('../index');

var promise = function(res) { return new Promise(res); };

var math = require('./services/math');
var rectangle = require('./services/rectangle');
var triangle = require('./services/triangle');
var surface = require('./services/surface');

//Promise.longStackTraces();

describe('service unit tests', function() {
	var mathService = math();

	it('should be inherently synchronous', function() {
		expect(mathService.add(2, 2)).to.equal(4);
	});

	it('should mock functions so they always return a promise', function() {
		var pAdd = procnet.mockFn(promise, mathService.add);
		return pAdd(2,3).then(function(res) {
			expect(res).to.equal(5);
		});
	});
	
	it('should be able to communicate with other instances', function() {
		var remote = procnet.mockRemote(promise, mathService);
		var service = rectangle(remote);
		return service
			.surface(2, 4)
			.then(function(a) {
				expect(a).to.equal(8);
			});
	});

	it('should be able to mock sets of remotes', function() {
		var mock = procnet.mocker(promise);
		var mocked = mock({
			math: {
				multiply: function(a, b) { return a * b; },
				add: function(a, b) { return a + b; }
			}
		}, rectangle);
		return mocked
			.perimeter(2, 4)
			.then(function(res) {
				expect(res).to.equal(12);
			});
	});

	it('should return one each value in order', function() {
		var roller = procnet.rollingFn(promise, [1,2]);
		return Promise.all([
			roller(), roller()
		]).spread(function(val1, val2){
			expect(val1).to.equal(1);
			expect(val2).to.equal(2);
		});
	});

	it('should be able to mock clusters of services', function() {
		var leafs = {
			math: procnet.mockRemote(promise, mathService)
		};
		var branches = {
			rectangle: rectangle,
			triangle: triangle,
			surface: surface
		};
		var services = procnet.mockCluster(promise, leafs, branches);
		
		return Promise.all([
			services.triangle.surface(10, 2).then(function(res) {
				expect(res).to.equal(10);
			}),

			services.surface.rectangle(2, 2).then(function(res) {
				//res.then(console.log.bind(console, 'contains:'));
				expect(res).to.contain('rectangle');
				expect(res).to.contain('4');
			})
		]);

	});
});
