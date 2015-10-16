
## Pogostick Http ![Build](https://travis-ci.org/AGhost-7/pogostick.svg?branch=master)
This is the implementation of the Pogostick protocol for http.

## Introductory Example

```javascript
// Use whichever promise library you want, as long as it follows Promises/A+ 
// spec.
var Promise = require('bluebird');
var pogo = require('pogostick-http');
var mkServer = pogo.server({
	host: 'localhost'	
});

var server = mkServer({
	add: function(a, b) {
		return 1 + 2;
	},
	// You can also return promises and it will return only the result contained
	// within it. If the promise is rejected, it will also be rejected on the 
	// client.
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

## Features

### Deep Objects
Pogostick supports using objects as namespaces. It also supports arrays of 
functions.

```javascript
// Server
var server = mkServer({
	foo: {
		bar: function() {
			return "foobar";
		},
		baz: function() {
			return "foobaz";
		}
	}
});
// etc...

// Client
mkClient({ port: 3000 }, function(err, remote) {
	remote.foo.bar().then(function(res) {
		console.log('server says: ', res); // -> server says: foobar
	});
});
```

### Pick-Your-Own Promises
As long as the library you choose follows the Promises/A+ specification, you
can use your favourite promises library. You just need to specify the factory
function so that pogostick can instantiate the promises for you.

```javascript
var Bluebird = require('bluebird');
var bluebirdMkClient = pogo.client(function(resolver) {
	return new Bluebird(resolver);
});

var Q = require('q');
var qMkClient = pogo.client(Q.Promise);

var when = require('when');
var whenMkClient = pogo.client(when.promise);
```

### Implicit Parameters
Implicit parameters in Pogostick are inspired by Scala implicit parameters. 
These were implemented to make it possible to pass authentication tokens and 
such into remote procedures without having to specify them every time. So,
here's an example:

Server:
```javascript
...
mkServer({
	greet: function() {
		// You access the implicit values sent by the client through the "this"
		// keyword.
		return "hello " + this.name + "!";
	}
});
...
```

Client:
```javascript
mkClient({ port: 3000 }, function(err, remote) {
	if(err) return console.log('there was an error loading the remote');
	var withName = remote.$implicitly('name', 'AGhost-7');
	// Using withName, you will automatically send "AGhost-7" to the server.
	withName
		.greet()
		.then(console.log.bind(console));
});
```

The client in this case will print to the console `Hello AGhost-7`.




## Module Types
`promiseFactory` is a function which accepts a resolver function and returns
a promise. It is bundled in most promise libaries and can usually be easily
created when it is not.

```javascript
var fs = require('fs');
var Q = require('q');
var p = Q.promise(function(resolve, reject) {
	fs.readFile('/etc/dkms', function(err, buf) {
		err ? reject(err) : resolve(buf.toString());
	});
});
p.then(console.log.bind(console));
```


## The Remote Object
The remote object contains all procedures that the server has listed, allowing
you to call the functions from the network. There are two additional methods
which are added to the remote object.

### `$end()`
Prevents the procedures on the remote from sending any more requests to the 
server. This is called internally in some cases.

```javascript
// returns a resolved promise if there was no error
remote.foo(); 
// Close the remote
remote.$end();
// skips fetching to the server and will just return a rejected promise
remote.foo();
```

## `$implicitly(key, value)`
Returns a new remote instance which will send the data to the server each time
you call the procedures on it.



## Client Events

### `error`
The error event is triggered whenever the client receives and `err` message
back from the server. Essentially, whenever the remote object returns a 
rejected promise.

This can be useful if you want to catch certain connection errors. For example,
you may want to give GUI feedback if you can't connect to the server because
there is no connection.

### `exit`
This is a response that the server can send to the client to terminate any
more requests. This will cause the remote to stop sending requests, and simply
return rejected promises every time.

### `end`
Called at any time the remote is no longer capable of sending requests. For the
http implementations, this is only the case when the server sends a `exit` 
response. For persistent connections such as TCP, the `end` event is triggered
whenever the connection is lost as well.


## Module Functions

### `client(promiseFactory)`
Returns a client generating function that you can pass an options object and
a complete handler to.
 
The options are passed to the underlying native nodeJS [http][1] module, giving
the options such as `port` and `host`.

You also have access to the `on` option, which alows you to specify event 
handlers.

### `https.client(promiseFactory)`
Returns a client generating function similar to `client(promiseFactory)`. Just
like `client(promiseFactory)`, the options are passed to the underlying native
nodeJs module, this time [https][2]. There is also the `on` option, which list
events you can listen to.

```javascript
var mkClient = pogo.client(promise);
var options = {
	host: 'localhost',
	port: 3000,
	on: {
		end: function() {
			console.log('Connection was ended');
		},
		error: function(err) {
			if(err.code === 'ECONNREFUSED') {
				console.log('could not connect to server!');
			}
		}
	}
};

mkClient(options, function(err, remote) {
	...
});
```

### `server(options)`
Accepts the default options and returns a server instantiation function. Each
server instance will inherit the inital options specified in the function.

The options are the following:
- `headers` specifies which headers to send out in each request.

### `https.server(options)`
Similar to `server(options` with two additional options.
- `cert`, the ssl certificate.
- `key`, which is the encryption key.

### `exit([message])`
This tells the client that the server is no longer available. The client 
implementation will stop its connection and the remotes will no longer send
requests, only returning rejected promises. Triggers the `end` and `exit` 
event.

```javascript
var pogo = require('pogostick-http');
...
mkServer({
	divide: function(a, b) {
		if(b === 0) {
			// The `message` argument is optional.
			return pogo.exit();
		} else {
			return a / b;
		}
	}
});
...
```

[1]: https://nodejs.org/api/http.html#http_http_request_options_callback
[2]: https://nodejs.org/api/https.html#https_https_request_options_callback
