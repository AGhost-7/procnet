module.exports = function remoteLoad(remoteFactory, deps, depsConfig, cb) {
	var remotes = [];
	function reduce(i) {
		if(remotes.length < deps.length) {
//					console.log('loading dependency:', depsMap[deps[i]]);

			remoteFactory(depsConfig[deps[i]], function(err, remote) {
				if(err) return cb(err);
				remotes.push(remote);
				reduce(i);
			});
		} else {
			cb(null, remotes);
		}
	}
	reduce(0);
};
//
//module.exports = {
//	/* This is the base loader used to handle the async aggregation of the remotes */
//	primitiveLoader: function(remoteFactory) {
//		return function(deps, depsMap, cb) {
//			var remotes = [];
//			function reduce(i) {
//				if(remotes.length < deps.length) {
////					console.log('loading dependency:', depsMap[deps[i]]);
//
//					remoteFactory(depsMap[deps[i]], function(err, remote) {
//						if(err) return cb(err);
//						remotes.push(remote);
//						reduce(i);
//					});
//				} else {
//					cb(null, remotes);
//				}
//			}
//			reduce(0);
//		};
//	}
//};
