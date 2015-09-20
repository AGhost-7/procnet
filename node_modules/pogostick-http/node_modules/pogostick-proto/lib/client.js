var serializer = require('./serializer');
var extend = require('extend');
var mkFn = require('mk-fn');

function parseField(val, path, mkSender) {
	if(typeof val === 'number') {
		return mkFn(val, mkSender(path));
	} else if(Array.isArray(val)) {
		var arr = [];
		for(var i = 0; i < val.length; i++) {
			arr.push(parseField(val[i], path + '.' + i, mkSender));
		}
		return arr;
	} else if(typeof val === 'object') {
		var res = {};
		for(var key in val) {
			if(val.hasOwnProperty(key)) {
				res[key] = parseField(val[key], path + '.' + key, mkSender);
			}
		}
		return res;
	}
}

function mkRemoteFactory(promiseFactory, requestFactory, options) {
	return function(path) {
		return function() {
			// the procol requires this to be an array.
			var args = Array.prototype.slice.call(arguments);
			return promiseFactory(function(resolve, reject) {

				requestFactory(extend({ body: serializer.call(path, args) }, options), function(err, msg) {
					if(err) return reject(err);
					
					if(msg[0] === 'err') {
						// if there is an error, I still need to parse the response
						// which contains the details on the error.
						reject(new Error(JSON.parse(msg[3])));
					} else if(msg[0] === 'res') {
						resolve(JSON.parse(msg[3]));
					}	
				});
			});
		};
	};
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
		// this will be the options object used for all requests for the client instance, in 
		// part determined by the factory.
		var defOptions = extend(extend({}, heldOptions), opts);
		
		requestFactory(extend({ body: serializer.ls() }, defOptions), function(err, msg) {
			if(err) return cb(err);

			var client = {};
			var listing;
			try {
				listing = JSON.parse(msg[3]);
			} catch(er) {
				return cb(new Error('JSON parser error: ' + er.message));
			}
			var remoteProducer = mkRemoteFactory(promiseFactory, requestFactory, defOptions);
			var remote = Object.keys(listing).reduce(function(accu, key) {
				accu[key] = parseField(listing[key], key, remoteProducer);
				return accu;
			}, {});
			cb(null, remote);	
		});
	};
};
