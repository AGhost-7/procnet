'use strict';

var Exit = require('./lib/exit');

module.exports = {
	client: require('./lib/client'),
	server: require('./lib/server'),
	Exit: Exit,
	exit: Exit.create
};
