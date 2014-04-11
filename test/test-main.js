var main = require("./main");

worker = {
	emit: function(){},
	url: 'http://test.com/'
};
var paths = [];

exports["test main"] = function(assert) {
  assert.pass("Unit test running!");
};

exports["test get tree"] = function(assert, done) {
	var data = {
		limit: 3,
		restore: paths[paths.length -1]
	}
	assert.pass("async Unit test running!");
	done();
};

require("sdk/test").run(exports);
