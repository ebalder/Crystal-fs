
var emit = self.port.emit;
var doc = document.documentElement;
var path; //working path
var actions = {
	open: function(data){
		emit('open-file', data.dir);
		return 0;
	},
	'save-file': function(data){
		emit('save-file', {
			data: data.data,
			file: data.file || null,
			path: path
		});
	},
	getDir: function(data){},
	'set-path': function(data){
		emit('prompt-file', {
			mode: data.mode || 'modeGetFolder',
			filter: data.filter || 'filterAll' 
		});
	}
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

self.port.on('set-path', function(data){
	path = data;
	var pathSet = new CustomEvent('path-set');
	doc.dispatchEvent(pathSet);
});
self.port.on('save-on-path', function(data){

});
self.port.on('create-on-path', function(data){

});
self.port.on('')
self.port.on('files', function(data){
})