/* jshint expr: true */

var client = require('../lib/client');
var serializer = require('../lib/serializer');
var Promise = require('bluebird');
var expect = require('chai').expect;

var promise = function(resolver) { return new Promise(resolver); };

function createSpy() {
	var spy;
 
	spy	= function(opts, cb){
		spy.request = opts.body.str ? opts.body.str : opts.body;
		cb(null, spy.response);
	};

	return spy;
}

var spy = createSpy();

var mkClient = client(promise, spy, {});

describe('client', function() {

	var remote;

	it('creates a remote object', function(done) {
		spy.response = serializer.init({
			mock: function() {},
			multiArg: function(a, b) {}
		})(Date.now(), '').split('\n');
		
		mkClient({}, function(err, r) {
			expect(err).to.not.exist;
			expect(r).to.exist;

			remote = r;
			done();
		});
	});

	it('should have methods properly initialized', function() {
		expect(remote.mock).to.exist;
		expect(remote.mock).to.be.instanceof(Function);
//		expect(remote.mock).to.not.throw(Error);
	});	

	it('should have the length property of set', function() {
		expect(remote.mock.length).to.equal(0);
		expect(remote.multiArg.length).to.equal(2);
	});


	it('should generate the arguments array', function() {
		spy.response = serializer.res(0,'', 'bar').split('\n');
		var p = remote.mock('foo');
			
		return p.then(function(res) {
			var args = JSON.parse(spy.request.split('\n')[4]);
			expect(args).to.contain('foo');
			expect(args).to.be.an.instanceof(Array);
			expect(res).to.equal('bar');
		});
	});

	it('should be able to handle deep functions', function(done) {
		spy.response = serializer.init({
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

	describe('implicits', function() {
		var withName;
		it('should create a new remote with methods using $implicitly', function() {	
			withName = remote.$implicitly('name', 'foo');
			expect(withName.mock).to.exist;
			expect(withName.mock).to.be.instanceof(Function);
		});

		it('should be able to send the implicits', function() {
			withName.mock();
			expect(spy.request).to.contain('foo');
		});
	});

	describe('closable', function() {
		var wasClosed = false;
		var wasExit = false;
		var remote;

		before(function(done) {
			spy.response = serializer.init({
				mock: function() {}
			})(Date.now(), '').split('\n');

			mkClient({
				on: {
					end: function() { wasClosed = true; },
					exit: function() { wasExit = true; }
				}
			}, function(err, rem) {
				remote = rem;
				done(err);
			});
		});

		it('should revent the procedures from sending requests', function() {
			spy.request = undefined;
			remote.$end();
			remote.mock().then(function(){}, function(){});
			expect(spy.request).to.equal(undefined);
		});
		
		it('should trigger events on close', function() {
			expect(wasClosed).to.be.true;
		});
	});
});
