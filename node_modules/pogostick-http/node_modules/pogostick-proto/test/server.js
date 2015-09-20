/* jshint expr: true */

var 
	server = require('../lib/server'),
	Promise = require('bluebird'),
	serializer = require('../lib/serializer'),
	expect = require('chai').expect;

var promiseFactory = function(resolver) { return new Promise(resolver); };

var serverSpy = function(func) {
	return function(data) {
		return func(data);
	};
};

var mkServer = server(serverSpy);
var procs = {
	add: function(a, b) {
		return a + b;
	},
	multiply: function(a, b) {
		return Promise.resolve(a * b);
	},
	foo: {
		bar: function() {
			return 'foobar';
		},
		boom: function() {
			throw new Error('BOOM');
		}
	}

};

var srv = mkServer(procs);

describe('server', function() {
	describe('initialization', function() {
		before(function() {
			this.res = srv(serializer.ls().split('\n'));
		});

		it('should send an init',function() {
			expect(this.res).to.contain('init');
			expect(this.res).to.contain(2);	
		});

		it('should contain the methods', function() {
			expect(this.res).to.contain('add');
			expect(this.res).to.not.contain('foobar');
		});
	});

	describe('calling remote procedures', function() {

		it('should be able to handle arrays', function() {
			var res = srv(serializer.call('add', [1,2]).str.split('\n'));
			expect(res).to.contain('3');
			expect(res).to.not.contain('err');
			expect(res).to.contain('res');
		});

		it('should be able to handle objects with length prop', function() {
			var args = { length: 2, 0: 1, 1: 2 };
			var res = srv(serializer.call('add', args).str.split('\n'));
			expect(res).to.contain('3');
			expect(res).to.not.contain('err');
			expect(res).contain('res');
		});

		it('should function properly even if a promise is returned', function(done) {
			var p = srv(serializer.call('multiply', [2, 2]).str.split('\n'));
			p.then(function(res) {
				expect(res).to.contain('4');
				expect(res).to.not.contain('err');
				expect(res).to.contain('res');
				done();
			});
		});

		it('should handle namespaces', function() {
			var res = srv(serializer.call('foo.bar', []).str.split('\n'));
			expect(res).to.contain('foobar');
			expect(res).to.not.contain('err');
			expect(res).to.contain('res');
		});

		it('should handle missing non-existant function calls', function() {
			var res = srv(serializer.call('DOOM', []).str.split('\n'));
			expect(res).to.contain('err');
			expect(res).to.not.contain('res');
		});

		it('should handle exceptions which are thrown by the remote procedure', function() {
			var res = srv(serializer.call('foo.boom', []).str.split('\n'));
			expect(res).to.contain('err');
			expect(res).to.not.contain('res');
		});

		it('should give response if request is completely invalid', function() {
			var res = srv('booya');
			expect(res).to.exist;
			expect(res).to.contain('err');
		});

	});

});

