var pogo = require('pogostick-http');
var math = require('./math');
var config = require('./remotes');

var mkServer = pogo.server();

var mathProcedures = math();

console.log('math procs', mathProcedures);

var server = mkServer(mathProcedures);
server.on('error', function(err) {
	console.log('there was an error');
});

server.listen(config.math.port, function() {
	console.log('server listening');

});



