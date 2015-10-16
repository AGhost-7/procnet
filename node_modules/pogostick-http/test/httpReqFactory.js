/* jshint expr: true */
var chai = require('chai');
var expect = chai.expect;

var http = require('http');
var httpReqFactory = require('../lib/reqFactory').http;

var server;
before(function(done){
	server = http.createServer(function(req, res) {
		var str = '';
		req.on('data', function(buf) {
			str += buf.toString();
		});
		req.on('end', function() {
			res.writeHead(200);
			res.write(str);
			res.end();
		});

	});
	server.listen(3001, done);
});

describe('http client', function() {
	it('should handle google!', function(done) {
		httpReqFactory({
			host: 'www.google.com',
			body: 'foobar'
		}, function(err) {
			expect(err).to.not.exist;
			done();
		});
	});

	it('should handle a simple case',function(done){
	 httpReqFactory({	
			port: 3001,
			host: 'localhost',
			body: 'hello'
		}, function(err, msg) {
			expect(err).to.not.exist;
			expect(msg).to.be.eql(['hello']);
			done();
		});
	});

	it('should split line breaks', function(done) {
		httpReqFactory({
			port: 3001,
			host: 'localhost',
			body: 'this\nis\nfoobar'
		}, function(err, msg) {
			expect(err).to.not.exist;
			expect(msg.length).to.be.eql(3);
			done();
		});
	});

	after(function() {

		server.close();
	});
});
