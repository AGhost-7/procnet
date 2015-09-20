/* jshint expr: true */

var client = require('../lib/client');
var serializer = require('../lib/serializer');
var Promise = require('bluebird');
var expect = require('chai').expect;

var promiseFactory = function(resolver) { return new Promise(resolver); };

var response;
var request;
// this is our "network layer" implementation.
var clientSpy = function(opts, cb) {
	request = opts.body.str ? opts.body.str : opts.body;
	cb(null, response);
};

var mkClient = client(promiseFactory, clientSpy, {});
var remote;

before(function(done) {
	response = serializer.init({
		mock: function() {},
		multiArg: function(a, b) {}
	})(Date.now(), '').split('\n');
	mkClient({}, function(err, r) {
		if(err) return done(err);
		remote = r;
		done();
	});
});

describe('client', function() {
	
	it('should have methods properly initialized', function() {
		expect(remote.mock).to.exist;
		expect(remote.mock).to.not.throw(Error);
	});	

	it('should have the length property of set', function() {
		expect(remote.mock.length).to.equal(0);
		expect(remote.multiArg.length).to.equal(2);
	});

	it('should generate the arguments array', function(done) {
		response = serializer.res(0,'', 'bar').split('\n');
		var p = remote.mock('foo');
			
		p.then(function(res) {
			var args = JSON.parse(request.split('\n')[4]);
			expect(args).to.contain('foo');
			expect(args).to.be.an.instanceof(Array);
			expect(res).to.equal('bar');
			done();
		});
	});

	it('should be able to handle deep functions', function(done) {
		response = serializer.init({
			foo: {
				bar: function() {}
			}
		})(0, '').split('\n');

		mkClient({}, function(err, r) {
			if(err) return done(err);
			expect(r.foo.bar).to.exist;
			done();
		});

	});

	
});
