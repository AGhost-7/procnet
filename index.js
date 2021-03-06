
'use strict';

var mkFn = require('mk-fn');
var extend = require('extend');
var path = require('path');
var getParams = require('get-parameter-names');

/** @module procnet */
var procnet = {};

/** 
 * More like syntatic sugar for defining services. You can list your dependencies
 * array to query them later.
 * <code><pre>
 * var foo = procnet.service(['bar'], function(bar) {
 *   return {
 *     foobar: function() { return 'foo' + bar; }
 *   };
 * });
 * procnet.dependencies(foo); // => ['bar']
 * var instance = foo('bar');
 * instance.foobar(); // => 'foobar'
 * </pre></code>
 *
 * You also have the option of omitting the array and listing your dependencies
 * directly just like with angular modules. It will infer what you mean
 * automatically.
 * <code><pre>
 * var rectangle = procnet.injectable(function(math) {
 *   return {
 *     perimeter: function(h, w) {
 *       return math.add(math.double(h), math.double(w));
 *     }
 *   };
 * });
 * procnet.dependencies(rectangle); // => ['math']
 * </pre></code>

 * @function service
 * @static
 * @param {array} dependencies Is an array of strings where each string is the
 * name of the service that the service requires to run.
 * @param {function} factory Is the funciton which returns the list of 
 * procedures. 
 * @returns function
 */
procnet.service = function service (dependencies, factory) {	
	var instantiator = arguments.length > 1 ? arguments[1] : arguments[0];		
	// This is NOT part of the public API and thus can be changed at any time.
	instantiator._dependencies = arguments.length > 1 ? arguments[0] : getParams(instantiator);

	instantiator['@@service'] = true;
	return instantiator;	
};

/**
 * @function injectable
 * @static
 * @alias service
 */
procnet.injectable = procnet.service;

/**
 * Returns the dependencies that need to be resoled and passed to the factory
 * to create a service instance.
 * @function dependencies
 * @static
 * @param {object} serviceFactory The factory which is used to create the
 * service;
 * @returns array
 */
procnet.dependencies = function dependencies(serviceFactory) {
	return serviceFactory._dependencies;
};

/** 
 * Takes the configuration with the type and then the name and changes it into 
 * a object with the name of the services as the key.
 *
 * @private
 * @function _flattenConfig
 * @static
 * @param {object} config Is the user-specified configuration to be flattened.
 * @returns object
 */
procnet._flattenConfig = function _flattenConfig(config) {
	var res = {};
	for(var type in config) {
		var typeSpace = config[type];
		for(var name in typeSpace) {
			var nameSpace = typeSpace[name];
			// private property, might be changed without major version bump.
			nameSpace._serviceType = type;
			res[name] = nameSpace;
		}
	}
	return res;
};

/** 
 * Load all dependencies for the user to create the service. 
 *
 * @private
 * @static
 * @function _loadServices
 * @param {object} factories Is a promise factory.
 * @param {object} config Is the flattened configuration file for all 
 * dependencies.
 * @param {array} dependencies Is an array of the dependency names.
 * @param {function} cb Complete handler. Either get and error or an array of
 * the remotes in the order given by the dependencies argument.
 * @returns void
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
 * Asynchronous dependency loader for setting up services. This will load up 
 * the service and return the precedures object that the service generates.
 *
 * @static
 * @function loader
 * @param {object} factories Is a map of service names which translate to a 
 * function accepting an option and a callback.
 * @param {object} config The configuration is used to store data which could 
 * be server-specific as well as other things such as ip addresses. Each 
 * factory is given the corresponding configuration needed to create the 
 * instance it is being asked to generate.
 * @returns function
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
 * A client is nothing more than a consumer. A good example would be a  server 
 * with a REST api trying to call remote services using procnet. It could of 
 * course also be a browser client trying to fetch data from remote servers.
 *
 * @static
 * @function client
 * @param {object} factories Contains all of the instanciators for the service 
 * types.
 * @param {object} config Has the configuration for each of the services.
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
 * Utility function for mocking service procedures for unit testing. It only 
 * makes the function always returna promise, which generated services don't 
 * always do.
 *
 * @static
 * @function mockFn
 * @param {function} promise Is a promise factory.
 * @param {function} fn Is the function to mock.
 * @returns function
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
 * Function which will return each value specified in the array in sequence
 * for each call. Each value will be promisified.
 *
 * <code><pre>
 * var values = [1, 2];
 *
 * var roller = procnet.rollingFn(promise, values);
 *
 * roller('foobar?'); // -> returns a resolved promise with the value 1.
 * roller('foobaz!'); // -> returns a resolved promise with the value 2.
 * roller('fooboo');  // -> returns a resolved promise with the value undefined.
 *
 * </pre></code>
 * 
 * This is useful for mocking functions such as database access functions.
 *
 * @static
 * @function rollingFn
 * @param {function} promise Is a promise factory.
 * @param {array} values Are the values the function will return on each
 * subsequent call.
 * @param {number} ln Is the length property of the function. This parameter is
 * optional.
 */ 
procnet.rollingFn = function rollingFn(promise, values, ln) {
	var iterator = 0;
	var fn = function() {
		return promise(function(resolve, reject) {
			resolve(values[iterator++]);
		});
	};

	if(ln !== undefined) return mkFn(ln, fn);
	else return fn;
};

/** 
 * Takes in a object with functions and ensures that they always return a 
 * promise. Useful for injecting them into services as fake networked remotes.
 *
 * @static
 * @function mockRemote
 * @param {function} promise is a promise factory.
 * @param {object} mock is the set of functions to mock. Can also contain 
 * objects, where the functons inside of that object will be mocked.
 * @returns object
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
 * To unit test, one will need to use mocking due to the services having 
 * external dependencies. Since procnet is so simple, you can still call 
 * directly the procedures once the service is instantianted.
 *
 * <code><pre>
 * var rectangle = procnet.service(['math'], function(math) {
 *   return {
 *     surface: function(a, b) {
 *       return math.multiply(a, b);
 *     }
 *   };
 * });
 *
 * var mock = procnet.mocker(promiseFactory);
 *
 * var mocked = mock({
 *   math: {
 *     multiply: function(a, b) { return a + b; }
 *   }
 * }, rectangle);
 *
 * mocked
 *   .surface(2, 5)
 *   .then(function(r) {
 *     assert.equal(r, 7);
 *   });
 * </pre></code>
 * @static
 * @function mocker
 * @param {function} promise is the promise factory
 * @param {object} mocks is an object where the key is the name of the service.
 * @param {function} service is the function returning an object will all of 
 * the procedures.
 * @returns function
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

/**
 * This allows you to more or less do integration testing while still avoiding
 * to make network calls.
 *
 * <code><pre>
 *
 * var leafs = {
 *   postgres: function() {},
 *   math: procnet.mockRemote(math)
 * };
 *
 * var recangle = procnet.service(['math'], function(math) {
 *   return {
 *     surface: function(w, h) {
 *       return math.multiply(w, w);
 *     }
 *   };
 * });
 *
 * var services = procnet.mockCluster(leafs, { rectangle: rectangle });
 *
 * services.rectangle.surface(10, 2).then(function(res) {
 *   assert.equal(res, 20);
 * });
 * </pre></code>
 * @static
 * @function mockCluster
 * @returns object
 * @param {function} promise Is yet again, a promise factory.
 * @param {object} leafs These are already loaded dependencies. For example,
 * if you still want to have a real database connection, you can inject it into
 * the cluster by adding its name and reference to the object.
 * @param {object} branches Are services which need to be mocked.
 */ 
procnet.mockCluster = function mockCluster(promise, leafs, branches) {
	
	function mock(loaded, load) {

		function isLoaded (serviceName) {
			return loaded[serviceName] !== undefined;
		}
		
		function mapService(serviceName) {
			return loaded[serviceName];
		}

		for(var serviceName in load) {
			var service = load[serviceName];
			// if I can load the service with all of its requirements, do it!
			var canLoad = service && service._dependencies.every(isLoaded);
			if(canLoad) {
				var deps = service._dependencies.map(mapService);
				var loadedService = service.apply(null, deps);
				loaded[serviceName] = procnet.mockRemote(promise, loadedService);
				load[serviceName] = undefined;
				return mock(loaded, load);
			}
		}

		if(Object.keys(load) > 0) throw 'Could not load cluster';
		return loaded;
	}

	return mock(extend({}, leafs), extend({}, branches));
};

/**
 * Returns a tuple where the first item is all the services in the object, and the rest are not.
 * This is a partition operation.
 *
 * @static
 * @function
 * @private
 */
procnet._serviceInObj = function(obj) {
	return Object.keys(obj).reduce(function(accu, depName) {
		var ind = obj[depName]['@@service'] ? 0 : 1;
		accu[ind][depName] = obj[depName];

		return accu;
	}, [{}, {}]);

};

/**
 * Takes the injectable and what has been loaded already and returns what is
 * available to load into the 
 *
 * @function
 * @static
 * @private
 */
procnet._injectables = function(inj, loaded) {
	return inj._dependencies.map(function(depName) {
		return loaded[depName];
	});
};

/**
 * Finds the next item that can be resolved. Returns undefined if there are no items
 * which can be resolved using what is already loaded.
 *
 * @function
 * @static
 * @private
 *
 */
procnet._nextToResolve = function(notLoaded, loaded) {
	var loadedNames = Object.keys(loaded);
	return Object.keys(notLoaded).filter(function(k) {
		var inj = notLoaded[k];

		var deps = inj._dependencies;
		if(deps.length === 0) return true;
		return deps.every(function(depName) {
			return loadedNames.indexOf(depName) > -1;
		});
	})[0];
};

/**
 * Returns true if the value is thenable.
 *
 * @function
 * @static
 * @private
 */
procnet._isAsync = function(val) {
	return typeof val.then === 'function';
};

/**
 * Returns the items which weren't resolved.
 *
 * @function
 * @static
 * @private
 */
procnet._findMissingDepdendencies = function(rest, loaded) {
	var missing = [];
	var loadedKs = Object.keys(loaded);
	Object.keys(rest).forEach(function(name) {
		var injectable = rest[name];
		procnet.dependencies(injectable).forEach(function(dep) {
			if(missing.indexOf(dep) === -1 && loadedKs.indexOf(dep) === -1) {
				missing.push(dep);
			}
		});
	});
	return missing;
};

/**
 * Walks to the next item to resolve. If there are async modules it will return
 * a promise, if not then it will return the resolved modules.
 */
procnet._resolveNext = function(rest, loaded) {
	if(Object.keys(rest).length === 0) {
		return loaded;
	}
	var nextName = procnet._nextToResolve(rest, loaded);
	if(nextName === undefined) {
		var missing = procnet._findMissingDepdendencies(rest, loaded);
		var pretty = missing.map(function(m) { return '- ' + m; }).join('\n');
		throw new Error('Could not resolve dependencies: \n' + pretty);
	}

	var next = rest[nextName];
	var inject = procnet._injectables(next, loaded);
	var applied = next.apply(null, inject);

	if(procnet._isAsync(applied)) {
		return applied.then(function(ap) {
			var nextRest = extend({}, rest);
			delete nextRest[nextName];

			var nextLoaded = extend({}, loaded);
			nextLoaded[nextName] = ap;

			return procnet._resolveNext(nextRest, nextLoaded);
		});
	} else {
		var nextRest = extend({}, rest);
		delete nextRest[nextName];

		var nextLoaded = extend({}, loaded);
		nextLoaded[nextName] = applied;
		return procnet._resolveNext(nextRest, nextLoaded);
	}

};

/**
 * Similar to loader, but instead is synchronous. More useful if you're just
 * using this library for dependency injection. Its really just synchronous
 * by default instead of forcing all functions to return a promise.
 *
 * <code><pre>
 *
 * var math = procnet.injectable(function() {
 *   return {
 *     add: function(a, b) { return a + b; },
 *     double: function(a) { return a * 2; }
 *   };
 * });
 *
 * var rectangle = procnet.injectable(['math'], function(math) {
 *   return {
 *     perimeter: function(h, w) {
 *       return math.add(math.double(h), math.double(w));
 *     }
 *   };
 * });
 *
 * var services = {
 *   'rectangle': rectangle,
 *   'math': math
 * };
 *
 * var loaded = procnet.resolve(services);
 *
 * console.log(loaded.perimeter(1, 1)); // => 4
 * </pre></code>
 *
 *
 * This function also supports async dependency loading, where an injectable
 * returns a promise instead of a instance. In this case the function will
 * return a promise. This is useful for injectables which need to load data
 * from databases and such.
 *
 * <code><pre>
 * var numberCache = procnet.injectable(function() {
 *   return Promise.resolve({
 *     1: 'One',
 *     2: 'Two',
 *     3: 'Three'
 *   });
 * });
 * var add = procnet.injectable(function(numberCache) {
 *   return function(x, y) { return x + y; };
 * });
 *
 * var loadedAsync = procnet.resolve({
 *   numberCache: numberCache,
 *   add: add
 * });
 * loadedAsync.then(function(loaded) {
 *   loaded.add(1, 2); // => 'Three'
 * });
 * </pre></code>
 *
 * @function resolve
 * @static
 * @param {object} toResolve Is the list of services that are either already
 * loaded or need to be loaded.
 * @returns {object | promise} All the services loaded. If some of the service instances are
 * returned as promises then the object returned will also be a promise.
 */

procnet.resolve = function(toResolve) {
	var result = procnet._serviceInObj(toResolve);
	var rest = result[0];
	var loaded = result[1];

	return procnet._resolveNext(rest, loaded);
};

module.exports = procnet;

