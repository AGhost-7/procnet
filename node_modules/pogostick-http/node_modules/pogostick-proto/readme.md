# Pogostick Proto

The goal is to have a promises-based, high performance, and transport-agnostic RPC 
library.

Duplex connections are achieved by having a “client” and a “server” on both sides of the 
connection.

Primary focus for this RPC is ensuring the future result is always completed.
This means if a network connection fails, it eagerly rejects the result instead 
of trying to reconnect. It is perfectly posssible to reconnect afterwards.

## Introductory Example

## Http Server
```javascript
var pogo = require('pogostick-http');

// Define default headers and other configurations.
var mkServer = pogo.server({
	headers: {
		'Content-Type': 'text/plain'
	}
});
// returns a http.Server instance
var server = mkServer({
	add: function(a, b) {
		return a + b;
	},
	foo: {
		bar: function() {
			return "foobar";
		}
	}
});

server.listen(3003);
```

## Http Browser Client
```javascript
var pogo = require('pogostick-browser');
var Promise = require('bluebird');
var promiseFactory = function(resolver) { return new Promise(resolver); };
var mkClient = pogo(promiseFactory, {
	host: 'localhost'
});

mkClient({ port: 3003 }, function(err, remote) {
	if(err) return console.log('there was an error loading the remote');
	Promise.all([
		remote.add(2, 4),
		remote.foo.bar()
	]).spread(function(sum, foo) {
		console.log('sum is:', sum);
		console.log('foobar is:', foo);
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





## Protocol Specification

The protocol is composed of five methods. `ls`, `init`, `call`, `res`, `err` 
and `exit. The method being called is specified on the first line of the 
message. Each argument following are separated by a line break.

Identification of the remote calls is necessary for the implementation in raw 
protocols such as TCP or UDP. Since the Pogostick protocol is transport 
agnostic, it includes such a requirement, even for the HTTP/HTTPS 
implementation.

### Implicits
Inspired by implicit parameters in the Scala language, implicits are 
pogostick's answer to cookies: Pieces of data which are automatically sent to 
the server, semi-persistent pieces of data between requests. They have some 
additional limitations when compared to cookies, but for the most part, provide
a solution to the problem which comes from not relying on http as much as one 
could.

Since the protocol is transport-agnostic, which means it could technically be 
implemented using a tcp connection or some other, I cannot rely on cookies, 
query strings, or anything of that sort. The only solution which comes to mind 
is having pieces of data which are automatically sent in the request created by 
the client.

### Protocol Methods

#### Proc Listing: `ls`

This is to enable compatibility with the implementation in http. The client must 
initialize communication by sending a ls request to the server. Server does not 
send the init packet until ls is requested.

	ls              -> Method Name
	1439948538953   -> Unix Timestamp
	3d532EfEQC      -> 10 Random [A-z0-9] Chars


#### Initializer: `init`

In the initial request done by the client, the method listing for the server is 
sent to the client. This allows the api to be defined directly on the client 
object given by the connection constructor. The protocol permits to transfer 
arrays and objects for the purpose of namespacing. Strings and numbers are not 
transferred over by the protocol, and are ignored by the client. The number 
sent at the key of the procedure specifies the number of arguments that the 
function accepts.

For example:

	init                          -> Method Name
	1439948538953                 -> Unix Timestamp
	3d532EfEQC                    -> 10 Random [A-z0-9] Chars
	{“add”:2,”multiply”:2}        -> Procedure Listing

Another example:

	init
	1439948538953                         -> Unix Timestamp
	3d532EfEQC                            -> 10 Random [A-z0-9] Chars
	{“add”: {“default”:3,”two”:2}}        -> Procedure Listing

#### Function Call: `call`

The call method is sent by the client to the server to request information, or 
just signal a change of state. Since it is possible for multiple requests to be 
pending, the next arguments a timestamp. long with a pseudo-random string is 
submitted to a maximum length of 10 characters, valid characters are A-z and 
0-9. The fourth argument is the procedure’s name, and the last are the 
arguments. Only the arguments are a valid json array, where each element is an 
argument to be feed to the procedure call.

Note: As long as there is still a connection, the server must respond.

	call                   -> Method Name
	1439948538953          -> Unix Timestamp
	3d532EfEQC             -> 10 Random [A-z0-9] Chars
	add.default            -> Procedure Call Name
	[1,2]                  -> Arguments Array
	{"token":"jn13jnsc0j"} -> Implicit parameters

#### Function Response: `res`

Stamp must be the stamp the client sent when the procedure was called.

	res             -> Method Name
	1439948538953   -> Unix Timestamp
	3d532EfEQC      -> 10 Random [A-z0-9] Chars
	3               -> Result

#### Function Error: `err`

	err             -> Method Name
	1439948538953   -> Unix Timestamp
	3d532EfEQC      -> 10 Random [A-z0-9] Chars
	“Error!”        -> JSON value (string|number|object|integer)

#### Closing Connection: `exit`

Exit can either represent a fatal error or a request by the client/server to 
end the connection. The second and third arguments are optional, but the line 
break must still be there.

Example request:

	exit
	
	
	{“message”:”Closing connection for no reason.”}

Another example, this time fatal:

	exit
	1439948538953    -> Unix Timestamp
	3d532EfEQC       -> 10 Random [A-z0-9] Chars
	{“message”:”Server cannot recover from error in procedure call.”}


