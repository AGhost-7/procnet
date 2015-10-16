function Exit(msg) {
	this.message = msg || '';
}

Exit.create = function(msg) {
	return new Exit(msg);
};

module.exports = Exit;
