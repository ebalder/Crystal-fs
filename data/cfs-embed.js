
var emit = self.port.emit;
var doc = document.documentElement;
var path = null; //working path
var actions = {
	'get-tree': function(data){
		emit('get-tree', data);
	},
	open: function(data){
		emit('open-file', data.dir);
		return 0;
	},
	'save-file': function(data){
		data.path = path;
		emit('save-file', data);
	},
	'set-path': function(data){
		emit('prompt-file', data);
	},
};

var cfs = function(action, data){
	actions[action](data);
	return 1;
};


/* Send the cfs function to page script */
var oncfs = new CustomEvent('cfs',{
	detail: cfs,
});
doc.dispatchEvent(oncfs);
/* Let the user ask for it */
doc.addEventListener('cfs-ask', function ask(ev){
	doc.dispatchEvent(oncfs);
	doc.removeEventListener('cfs-ask', ask);
	return false;
});


self.port.on('create-on-path', function(data){

});

self.port.on('files', function(data){
});
self.port.on('save-on-path', function(data){

});
self.port.on('set-path', function(data){
	path = data;
	var pathSet = new CustomEvent('path-set');
	doc.dispatchEvent(pathSet);
});
self.port.on('got-tree', function(data){
	var gotTree = new CustomEvent('got-tree', {detail: data});
	doc.dispatchEvent(gotTree);
});