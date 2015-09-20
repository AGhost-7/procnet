# TODO
Update the protocol to include the length property for functions. This way you can use curry functionalities and other things which rely on the `length` property.

# Goal

The goal is to have a promises-based, high performance, and transport-agnostic RPC library.

Duplex connections are achieved by having a “client” and a “server” on both sides of the connection.

note: dnode is good, but doesn’t keep in mind failures the way I think a resilient system should.

The question is, how to handle this in a rpc system in NodeJS?

Also, dnode doesn’t handle deep objects, which sort of sucks. I want namespaces.

The goal of defining a protocol for such a library is to make it easier to support different 
transports. It should be possible to adapt this to use websockets, plain old HTTP, TCP, or even UDP.

# Protocol

The protocol is composed of five methods. `ls`, `init`, `call`, `res`, `err` and `exit`. The method 
being called is specified on the first line of the message. Each argument following are separated by
a line break.

Identification of the remote calls is necessary for the implementation in raw protocols such as TCP 
or UDP. Since the Pogostick protocol is transport agnostic, it includes such a requirement, even for
 the HTTP/HTTPS implementation.

# Network Implementation

Currently, I think I will stick to http/https since implementing the protocol on tcp properly will 
be a bit too hairy to be worthwhile, especially considering http is implemented using libuv under 
the hood. Thanks to keepalive, http is still a fairly good choice even for applications with lots of
frequent requests.

# Protocol Methods

## Proc Listing: `ls`

This is to enable compatibility with the implementation in http. The client must initialize 
communication by sending a ls request to the server. Server does not send the init packet until ls 
is requested.

	ls              -> Method Name
	1439948538953   -> Unix Timestamp
	3d532EfEQC      -> 10 Random [A-z0-9] Chars


## Initializer: `init`

In the initial request done by the client, the method listing for the server is sent to the client. 
This allows the api to be defined directly on the client object given by the connection constructor.
The protocol permits to transfer arrays and objects for the purpose of namespacing. Strings and 
numbers are not transferred over by the protocol, and are ignored by the client.

For example:

	init                          -> Method Name
	1439948538953                 -> Unix Timestamp
	3d532EfEQC                    -> 10 Random [A-z0-9] Chars
	{“add”:true,”multiply”:true}  -> Procedure Listing

Another example:

	init
	1439948538953                         -> Unix Timestamp
	3d532EfEQC                            -> 10 Random [A-z0-9] Chars
	{“add”: {“default”:true,”two”:true}}  -> Procedure Listing

## Function Call: `call`

The call method is sent by the client to the server to request information, or just signal a change 
of state. Since it is possible for multiple requests to be pending, the next arguments a timestamp.
long with a pseudo-random string is submitted to a maximum length of 10 characters, valid characters
 are A-z and 0-9. The fourth argument is the procedure’s name, and the last are the arguments. Only 
the arguments are a valid json array, where each element is an argument to be feed to the procedure 
call.

Note: As long as there is still a connection, the server must respond.

	call            -> Method Name
	1439948538953   -> Unix Timestamp
	3d532EfEQC      -> 10 Random [A-z0-9] Chars
	add.default     -> Procedure Call Name
	[1,2]           -> Arguments Array

## Function Response: `res`

Stamp must be the stamp the client sent when the procedure was called.

	res             -> Method Name
	1439948538953   -> Unix Timestamp
	3d532EfEQC      -> 10 Random [A-z0-9] Chars
	3               -> Result

## Function Error: `err`

	err             -> Method Name
	1439948538953   -> Unix Timestamp
	3d532EfEQC      -> 10 Random [A-z0-9] Chars
	“Error!”        -> JSON value (string|number|object|integer)

## Closing Connection: `exit`

Exit can either represent a fatal error or a request by the client/server to end the connection. 
The second and third arguments are optional, but the line break must still be there.

Example request:

	exit
	
	
	{“message”:”Closing connection for no reason.”}

Another example, this time fatal:

	exit
	1439948538953    -> Unix Timestamp
	3d532EfEQC       -> 10 Random [A-z0-9] Chars
	{“message”:”Server cannot recover from error in procedure call.”}


