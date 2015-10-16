
'use strict';

var serializer = require('./serializer');
var extend = require('extend');
var mkFn = require('mk-fn');

/* This is what is used to travel through the listen sent by the server. 
 * TODO: Optimize to a while loop or something. Not really important atm since
 * its only executed on the initial connection.
 */
function parseField(
		promiseFactory, 
		requestFactory,
		options,
		events,
	 	state,
		path,
		val) {
	// if its a number, then according to the protocol we have a function.
	if(typeof val === 'number') {
		var proc = mkRemoteProc(
			promiseFactory, 
			requestFactory, 
			options,
			events,
			state, 
			path);
		return mkFn(val, proc);
	} else if(Array.isArray(val)) {
		var arr = [];
		for(var i = 0; i < val.length; i++) {
			var parsed = parseField(
					promiseFactory, 
					requestFactory, 
					options,
					events,
					state,
					path + '.' + i,
					val[i]);
			arr.push(parsed);
		}
		return arr;
	} else if(typeof val === 'object') {
		var res = {};
		for(var key in val) {
			if(val.hasOwnProperty(key)) {
				var parsedObj = parseField(
						promiseFactory,
						requestFactory,
						options,
						events,
						state,
						path + '.' + key,
						val[key]);

				res[key] = parsedObj;
			}
		}
		return res;
	}
}

function mkRemoteProc(
		promiseFactory, 
		requestFactory, 
		options, 
		events, 
		state, 
		path) {
	return function() {
		if(state.isEnded) {
			return promiseFactory(function(resolve, reject) {
				return reject(new Error('Connection is closed'));
			});
		}

		// Lazy evaluation is used to handle the caching to keep things optimal.
		// Convert it to a string once, and since the object is to some extent 
		// immutable, I don't need to convert it after that for this particular
		// object instance.
		if(this._implicitsCache === undefined) {
			this._implicitsCache = JSON.stringify(this._implicits);
		}

		var implicits = this._implicitsCache;
		// the procol requires this to be an array.
		var args = Array.prototype.slice.call(arguments);
		return promiseFactory(function(resolve, reject) {
			var body = serializer.call(path, args, implicits);
			var opts = extend({ body: body }, options);
			requestFactory(opts, function(err, msg) {
				if(err) {
					reject(err);
					if(events.broadcastError) events.error(err);
					return;
				}

				switch(msg[0]) {
					case 'exit':
						// all functions will now return a rejected promise.
						state.isEnded = true;
						var exitReason;
						if(msg[3] !== undefined) {
							try {
								exitReason = JSON.parse(msg[3]);
							} catch(err) {}
						}
						events.exit(msg[1], msg[2], exitReason);
						events.end(msg[1], msg[2], exitReason);
						break;
					case 'err':
						var res;
						try {
							res = new Error(JSON.parse(msg[3]));
						} catch (err) {
							res = err;
						}

						reject(res);
						if(events.broadcastError) events.error(res);
						break;
					case 'res':
						resolve(JSON.parse(msg[3]));
						break;
					default:
						// ????

				}
			});
		});
	};

}

/* Creates a new instance with the exact same remote procedures but with a 
 * change in the implicit object.
 */ 
function $implicitly(key, value) {
	var impl = {};
	for(var k in this._implicits) {
		impl[k] = this._implicits;
	}
	impl[key] = value;
	return new this.constructor(impl);
}

/* Generates a class from the procedure listing call to the server which will 
 * be our remote.
 */ 
function createRemoteClass(promiseFactory, requestFactory, listing, options) {
	// At this stage, I don't have much of a choice to add mutable state. If
	// the remote has been closed at the protocol-level, they need to change 
	// of state to alter their behaviour. State in this case will be shared
	// accross all remote instances which have the same connection, even if
	// they have different implicits.
	var state = {
		isEnded: false
	};

	var on = options.on || {};
	var events = {
		end: on.end,
		error: on.error,
		broadcastError: !!on.error,
		exit: on.exit
	};

	var Remote = function(impl) {
		this._implicits = impl;
	};

	var RemoteProto = Object.create(null);
	for(var key in listing) {
		RemoteProto[key] = parseField(
				promiseFactory,
				requestFactory,
				options,
				events,
				state,
				key,
				listing[key]);
	}
	
	Remote.prototype = RemoteProto;
	Remote.prototype.$implicitly = $implicitly;
	
	// I need to externalize the `end` handler since in some situation the end
	// will be protocol specific, e.g., tcp streams (persistent connections).
	Remote.prototype.$end = function() {
		state.isEnded = true;
		if(typeof events.end === 'function') {
			events.end.apply(this, arguments);
		}
	};

	Remote.prototype.constructor = Remote;

	return Remote;
}

/* Handles any case where there was an error fetching the procedure listing. 
 */
function initError(msg) {
	var errMsg;
	try {
		errMsg = JSON.parse(msg[3]);
	} catch(err) {
		return new Error('Error requesting procedure listing');
	}
	return new Error(errMsg);
}

/* To make this agnostic, I need to use a function which will handle the 
 * the request logic, abstracting the transport completely from this module.
 *
 * promiseFactory: function(resolver: function(resolve, reject)): Promise
 *
 * requestFactory: function(options, cb: function(err, msg: Array<String>)): void
 *
 */
module.exports = function(promiseFactory, requestFactory, opts) {
	// clone this just to be on the safe side.
	var heldOptions = opts ? extend({}, opts) : {};
	// return a client factory
	return function(opts, cb) {

		// this will be the options object used for all requests for the client 
		// instance, in part determined by the factory.
		var defOptions = extend(extend({}, heldOptions), opts);

		//var events = defOptions.on;

		// start by asking the server to list its procedure which we can use.
		var initOpts = extend({ body: serializer.ls() }, defOptions);
		requestFactory(initOpts, function(err, msg) {
			// the underlying network error should be propagated as it will be the 
			// more useful than a cryptic, library-specific error. E.g., 
			// ERRCONREFUSED will be more useful to know.
			if(err) return cb(err);
			
			// The protocol permits returning an `err` or `exit` response for the
			// `ls` call.
			if(msg[0] === 'err' || msg[0] === 'exit') {
				return cb(initError(msg));
			}

			// While it should not happen, it is possible for a parse error. Since
			// this library aims to never throw anything, it should handle parse
			// errors.
			var listing;
			try {
				listing = JSON.parse(msg[3]);
			} catch(er) {
				return cb(new Error('JSON parser error: ' + er.message));
			}
			
			// Since implicits create a new remote every time, I should optimize
			// object creation to limit the overhead. Instead of generating an entire
			// remote every time, the remote procedure functions are placed on a 
			// prototype which is created on the fly at the initial connection.
			var Remote = createRemoteClass(
					promiseFactory, 
					requestFactory, 
					listing, 
					defOptions);

			cb(null, new Remote({}));	
		});
	};
};
