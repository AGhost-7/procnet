'use strict';

var cleanInitField = function(field){
	if(typeof field === 'function') {
		return field.length;
	} else if (typeof field === 'object') {
		if(Array.isArray(field)) {
			return field.map(cleanInitField);
		} else {
			var res = {};
			for(var key in field) {
				if(field.hasOwnProperty(key)) {
					res[key] = cleanInitField(field[key]);
				}
			}
			return res;
		}
	}
};

var cleanProcObj = function(obj) {
	var processed = {};
	for(var key in obj) {
		if(obj.hasOwnProperty(key)) {
			processed[key] = cleanInitField(obj[key]);
		}
	}
	return processed;
};

var randString = (function() {
	var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	return function() {
		var res = [];
		for(var i = 0; i < 10;i++){
			var at = Math.floor(Math.random() * chars.length);
			var c = chars.charAt(at);
			res.push(c);
		}
		return res.join('');
	};
})();

module.exports = {

	/* On initial connection, the client sends a request to receive the init
	 * call from the server
	 */
 	ls: function() {
		return [
			'ls',
			Date.now(),
			randString()
		].join('\n');
	},	


	/* Server initially sends a listing of all available procedures.
	 *
	 * The procedure listing is a JSON object, where each field can be a container
	 * or a "true".
	 *
	 * "true" maps to a remote function, while the containers are used as 
	 * namespaces to stay organized.
	 *
	 * Sender: Server; Receiver: Client
	 */ 
	init: function(functions){
		var cleaned = cleanProcObj(functions);
		var body = JSON.stringify(cleaned);

		return function(stamp, rand) {
			return [
				'init', 
				stamp,
				rand,
				body		
			].join('\n');
		};
	},

	/* Whenever a procedure is called by the API, the client send a "call" message
	 * to the server.
	 *
	 * If the function is namespaced (by an array or object), the notation used to
	 * denote mutiple keys is a dot, e.g. "foo.bar".
	 *
	 * In this case it returns a object containing the serialized payload, stamp, 
	 * and random string since the implementation for tls/tcp/websockets will need
	 * this to manage the event processing.
	 *
	 * Sender: Client; Receiver: Server
	 */ 
	call: function(path, args, implicits) {
		var rand = randString();
		var stamp = Date.now();
		return {
			stamp: stamp,
			rand: rand,
			str: [
				'call',
				stamp,
				rand,
				path,
				JSON.stringify(args),
				implicits ? JSON.stringify(implicits) : ''
			].join('\n')
		};
	},

	/* Response sent by the server.
	 *
	 * The stamp and randStr must be the ones that te client sent when calling the
	 * procedure.
	 *
	 * Sender: Server; Receiver: Client
	 */ 
	res: function(stamp, randStr, res) {
		return [
			'res',
			stamp,
			randStr,
			JSON.stringify(res)
		].join('\n');
	},

	/* Whenever there is an error on the server where the client would probably 
	 * need to use a different code path, the server send the err message.
	 *
	 * Sender: Server; Receiver: Client
	 */ 
	err: function(stamp, randStr, res) {
		return [
			'err',
			stamp,
			randStr,
			JSON.stringify(res)
		].join('\n');
	},
	
	/* Server response or push message sent to close the connection 
	 *
	 * The stamp and randStr are optional.
	 *
	 * Sender: Server; Receiver: Client
	 */
	exit: function(stamp, randStr, err) {
		if(arguments.length === 3) {
			return [
				'err',
				stamp,
				randStr,
				err
			].join('\n');
		} else {
			return [
				'err',
				'',
				'',
				JSON.stringify(err)
			].join('\n');
		}
	}
};
