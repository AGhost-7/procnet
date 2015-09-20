
var Promise = require('bluebird');
var promise = function(res) { return new Promise(res); };
var procnet = require('../index');
var expect = require('chai').expect;
var pogo = require('pogostick-http');

var math = require('./services/math');
var rectangle = require('./services/rectangle');

var mkClient = pogo.client(promise);
var mkServer = pogo.server(promise);

describe('server instancing', function() {
	var config = {
		http: {
			math: {
				port: 3001,
				host: 'localhost'
			},
			rectangle: {
				port: 3002,
				host: 'localhost'
			}
		}
	};
	var factories = { http: mkClient };

	var mathServer;
	before(function(cb) {
		mathServer = mkServer(math());
		mathServer.listen(config.http.math.port, cb);
	});

	var procClient = procnet.client(factories, config);
	
	it('should be able to connect through the client', function(done) {
		procClient(['math'], function(err, remotes) {
			expect(err).to.not.exist;
			expect(remotes.math).to.exist;
			expect(remotes.math.add).to.be.instanceof(Function);
			done();
		});
	});

	var load = procnet.loader({ http: mkClient }, config);
	var rectangleServer;
	it('should be able to instance a service depending on another', function(done) {
		load(rectangle, function(err, procs) {
			expect(err).to.not.exist;
			expect(procs.perimeter).to.be.instanceof(Function);
			rectangleServer = mkServer(procs);
			rectangleServer.listen(config.http.rectangle.port);
			done();
		});
	});

	it('returns proper results using client', function(done) {
		procClient(['rectangle', 'math'], function(err, remotes) {
			expect(err).to.not.exist;
			Promise.all([
				remotes.math.add(1, 2),
				remotes.rectangle.perimeter(2, 2)
			]).spread(function(sum, per) {
				expect(sum).to.equal(3);
				expect(per).to.equal(8);
			});

		});
	});

	after(function(done) {
		mathServer.close();
		rectangleServer.close();
	});

});


