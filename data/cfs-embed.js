
var emit = self.port.emit;
var doc = document.documentElement;
var actions = {
	'get-tree': function(data){
		emit('get-tree', data);
		return;
	},
	open: function(data){
		emit('open-file', data.dir);
		return;
	},
	'revoke': function(data){
		emit('revoke');
		return;
	},
	'save-file': function(data){
		data.path = path;
		emit('save-file', data);
		return;
	},
	'set-path': function(data){
		emit('set-path', data);
		return;
	},
};

var cfs = function(action, data){
	actions[action](data);
	return;
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
	return;
});


/* ====================== Response Events ============================= */

var fileSaved = new CustomEvent('file-saved');
var fileCreated = new CustomEvent('file-created');

self.port.on('create-on-path', function(data){
	return;
});
self.port.on('file', function(data){
	var gotTree = new CustomEvent('got-file', {detail: data});
	doc.dispatchEvent(gotFile);
	return;
});
self.port.on('files', function(data){
	var gotTree = new CustomEvent('got-files', {detail: data});
	doc.dispatchEvent(gotFiles);
	return;
});
self.port.on('save-on-path', function(data){
	doc.dispatchEvent(fileSaved);
	return;
});
self.port.on('path-set', function(data){
	var pathSet = new CustomEvent('path-set', {detail: data});
	return;
});
self.port.on('got-tree', function(data){
	var gotTree = new CustomEvent('got-tree', {detail: data});
	doc.dispatchEvent(gotTree);
	return;
});
self.port.on('error', function(data){
	var error = new CustomEvent('cfs-error', {detail:data});
	return;
})