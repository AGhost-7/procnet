var serializer = require('../lib/serializer');
var _ = require('lodash');

var chai = require('chai');
chai.should();


describe('serializer', function() {
	describe('ls method', function() {
		it('should not throw an exception', function() {
			serializer.ls();
		});

	});
	
	describe('init method', function() {
		var init = serializer.init;
		
		var simplMsg = {
			add: function(a,b) { return a + b; }
		};

		it('should parse simple procedure listings', function() {
			var str = 
				'init\n' +
				'0\n' +
				'\n'  + 
				'{"add":2}';
			var ser = init(simplMsg)(0, '');
			ser.should.eql(str);
		});

//		it('should remove numbers', function() {
//			var procs = _.clone(simplMsg);
//			procs.foo = 2;
//			var ser = init(procs)(0,'');
//
//			ser.should.not.contain("2");
//		});
//
		it('should be able to handle deep funcitons', function() {
			var procs = _.clone(simplMsg);
			procs.foo = {
				bar: function() {},
				baz: function() {}
			};
			
			var ser = init(procs)(0, '');
			ser.should.contain("bar");
		});


	});

	describe('call method', function() {
		it('should have each field properly separated, even if there is a string with a line break', function() {
			var hello = 'hello\nworld';
			var srv = serializer.call('foo', [1, hello]).str;
			
			var msg = srv.split('\n');

			var parsed = JSON.parse(msg[4]);
			parsed[1].should.eql(hello);
		});
	});

});


