
var pogo = require('pogostick-http');
var rectangle = require('./rectangle');
var Promise = require('bluebird');
var config = require('./remotes');

var promiseFactory = function(res) { return new Promise(res); };
var mkClient = pogo.client(promiseFactory);
var mkServer = pogo.server();

mkClient(config.math, function(err, remote) {
	if(err) return console.log(err);

	var rectangleProcedures = rectangle(remote);
	console.log('rectangle procs:', rectangleProcedures);
	var server = mkServer(rectangleProcedures);

	server.listen(3002, function() {
		console.log('rectangle server is running');
	});
});

