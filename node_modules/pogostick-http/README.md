This is the implementation of the Pogostick protocol for http.

```javascript
// Use whichever promise library you want, as long as it follows Promises/A+ spec.
var Promise = require('bluebird');
var pogo = require('pogostick-http');

var server = pogo.server({
	add: function(a, b) {
		return 1 + 2;
	},
	// You can also return promises and it will return only the result contained
	// within it. If the promise is rejected, it will also be rejected on the client.
	delayedGreet: function(name) {
		return new Promise(function(resolve) {
			setTimeout(function() { 
				resolve('hello world!');
			}, 5000);
		});
});



// you need to pass to the client constructor a function which generates
// promise instances.
var promiseFactory = function(resolver) { return new Promise(resolver); };
var mkClient = pogo.client(promiseFactory, { host: 'localhost' });

server.listen(3000, function() {
	mkClient({ port: 3000 }, function(err, remote) {
		Promise.all([
			remote.add(1, 2),
			remote.delayedGreet()
		]).spread(function(sum, greet) {
			console.log(sum, greet);
		});
	});
});

```
