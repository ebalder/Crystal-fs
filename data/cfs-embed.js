
var emit = self.port.emit;
var doc = document.documentElement;

console.log('FFFFFFFFFFFFFFFFFFFFFFFF: ', document.querySelector("head > meta[CFS = 'true']"));
if (document.querySelector("head > meta[CFS = 'true']")){
	console.log('$$$$$$$$$$');
	var oncfs = new CustomEvent('cfs',{
		detail: function(action, data, callback){
			emit(action, data, callback);
			return;
		};,
	});
	doc.dispatchEvent(oncfs);

	self.port.on('error', function(data){
		var error = new CustomEvent('cfs-error', {detail:data});
		doc.dispatchEvent(error);
		return;
	});

}


