

var mkFn = require('mk-fn');

var procnet = {};

/** 
 * More like syntatic sugar for defining services. You could technically DIY. 
 * @param {array} dependencies Is an array of strings where each string is the name of the
 * service that the service requires to run.
 * @param {function} factory Is the funciton which returns the list of procedures.
 */
procnet.service = function service (dependencies, factory) {	
	var instantiator = arguments.length > 1 ? arguments[1] : arguments[0];		
	instantiator._dependencies = arguments.length > 1 ? arguments[0] : [];
	return instantiator;	
};

/** 
 * Takes the configuration with the type and then the name and changes it into a object 
 * with the name of the services as the key.
 */
procnet._flattenConfig = function _flattenConfig(config) {
	var res = {};
	for(var type in config) {
		var typeSpace = config[type];
		for(var name in typeSpace) {
			var nameSpace = typeSpace[name];
			nameSpace._serviceType = type;
			res[name] = nameSpace;
		}
	}
	return res;
};

/** 
 * Load all dependencies for the user to create the service. 
 * @param {object} factories
 * @param {object} config
 * @param {array} dependencies
 * @param {function} cb
 */
procnet._loadServices = function _loadServices(factories, config, dependencies, cb) {
	var remotes = [];
	function reduce(i) {
		if(remotes.length >= dependencies.length) {
			cb(null, remotes);
		} else {
			var depName = dependencies[i];
			var remoteConf = config[depName];
			var type = remoteConf._serviceType;
			factories[type](remoteConf, function(err, remote) {
				if(err) return cb(err);
				remotes.push(remote);
				reduce(i + 1);
			});
		}
	}
	reduce(0);
};

/** 
 * Asynchronous dependency loader for setting up services. This will load up the service 
 * and return the precedures object that the service generates.
 *
 * @param {object} factories Is a map of service names which translate to a function 
 * accepting an option and a callback.
 * @param {object} config The configuration is used to store data which could be 
 * server-specific as well as other things such as ip addresses. Each factory is given the
 * corresponding configuration needed to create the instance it is being asked to 
 * generate.
 */
procnet.loader = function loader(factories, config) {
	// start by flattening the config since I dont need to know
	// more information to do that
	var flatConfig = procnet._flattenConfig(config);

	return function(service, cb) {
		// load services
		function whenLoaded(err, remotes) {
			if(err) return cb(err);
			var procs = service.apply(null, remotes);
			cb(null, procs);
		}
		procnet._loadServices(factories, flatConfig, service._dependencies, whenLoaded);
	};
};

/** 
 * A client is nothing more than a consumer. A good example would be a  server with a REST
 * api trying to call remote services using procnet. It could of course also be a browser 
 * client trying to fetch data from remote servers.
 * 
 * @see loader
 */ 
procnet.client = function client(factories, config) {
	var flatConfig = procnet._flattenConfig(config);
	return function(deps, cb) {
		procnet._loadServices(factories, flatConfig, deps, function(err, remotes) {
			if(err) return cb(err);

			var remoteObj = deps.reduce(function(obj, name, i) {
				obj[name] = remotes[i];
				return obj;
			}, {});
			cb(null, remoteObj);

		});
	};
};

/** 
 * Utility function for mocking service procedures for unit testing. It only makes the 
 * function always returna promise, which generated services don't always do.
 * @param {function} promise Is a promise factory.
 * @param {function} fn Is the function to mock.
 */
procnet.mockFn = function mockFn(promise, fn) {
	return mkFn(fn.length, function() {
		var args = arguments;
		var t = this;
		return promise(function(resolve, reject) {
			resolve(fn.apply(t, args));
		});
	});
};

/** 
 * Takes in a object with functions and ensures that they always return a promise. Useful 
 * for injecting them into services as fake networked remotes.
 * @param {function} promise is a promise factory.
 * @param {object} mock is the set of functions to mock. Can also contain objects, where 
 * the functons inside of that object will be mocked.
 */ 
procnet.mockRemote = function mockRemote(promise, mock) {
	return Object.keys(mock).reduce(function(obj, k) {
		// this should be able to handle deep objects.
		if(typeof mock[k] === 'function')
			obj[k] = procnet.mockFn(promise, mock[k]);
		else
			obj[k] = procnet.mockRemote(promise, mock[k]);
		return obj;
	}, {});
};

/** 
 * To unit test, one will need to use mocking due to the services having external 
 * dependencies. Since procnet is so simple, you can still call directly the procedures 
 * once the service is instantianted.
 *
 * <code><pre>
 * var rectangle = procnet.service(['math'], function(math) {
 * 	return {
 * 		surface: function(a, b) {
 * 			return math.multiply(a, b);
 * 		}
 * 	};
 * });
 *
 * var mock = procnet.mocker(promiseFactory);
 *
 * var mocked = mock({
 * 	math: {
 * 		multiply: function(a, b) { return a + b; }
 * 	}
 * }, rectangle);
 *
 * mocked
 * 	.surface(2, 5)
 * 	.then(function(r) {
 * 		assert.equal(r, 7);
 * 	});
 * </pre></code>
 *
 * @param {function} promise is the promise factory
 * @param {object} mocks is an object where the key is the name of the service.
 * @param {function} service is the function returning an object will all of the 
 * procedures.
 */
procnet.mocker = function mocker(promise) {
	return function(mocks, service) {
		var mocked = service._dependencies.map(function(depName) {
			var dep = mocks[depName];
			return procnet.mockRemote(promise, mocks[depName]);			
		});

		return procnet.mockRemote(promise, service.apply(null, mocked));
	};
};

if(module && module.exports)
	module.exports = procnet;
else
	window.procnet = procnet;