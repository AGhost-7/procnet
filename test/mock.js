/* jshint expr: true */

var Promise = require('bluebird');
var expect = require('chai').expect;
var procnet = require('../index');
//var pogo = require('pogostick-http');
var promise = function(res) { return new Promise(res); };

var math = require('./services/math');
var rectangle = require('./services/rectangle');

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
});

//var remoteLoad = require('../lib/remoteLoad');
//
//describe('loading services', function() {
//	var config = {
//		math: {
//			ip: 8001,
//			host: 'localhost'
//		},
//		rectangle: {
//			ip: 8002,
//			host: 'localhost'
//		}
//	};
//	var mkServer = pogo.server();
//	var promiseFactory = function(f) { return new Promise(f); };
//	var loadSimple = remoteLoad.primitiveLoader(pogo.client(promiseFactory));
//	var mathService = math();
//
//	// I need to be able to load services using a requestFactory.
//	// This means I also require this, and need some level of injectability
//	// to keep boilerplate at a minimum.
//	it('should accept dependencies and return a service generator', function() {
//		expect(loadSimple).to.be.instanceof(Function);
//	});
//
//	it('should be able to load empty deps', function(done) {
//		
//		// Now I need to mock my stuff...
//		loadSimple(math._dependencies, config, function(err, remotes) {
//			expect(err).to.not.exist;
//			expect(remotes).to.be.empty;
//			done();
//		});
//
//	});
//
//	it('should load dependencies', function(done) {
//		this.timeout(20000);
//		// load the math server
//		var server = mkServer(mathService);	
//		
//		server.listen(config.math.ip, function(err){
//			//load the services and then check if its working		
//			loadSimple(rectangle._dependencies, config, function(err, remotes) {
//				expect(err).to.not.exist;
//				expect(remotes.length).to.equal(1);
//				done();
//			});
//
//		});
//	});
//
//	
//	
//});
