
var emit = self.port.emit;
var doc = document.documentElement;
var mid = 0; //message id

var cfs = function(action, data, success, error){
	data = data || {};
	data.mid = '' + mid;
	mid++;

	var cfsObject = new CFSObject(action, data);

	cfsObject.success = success || function(){};
	cfsObject.error = error || function(){};

	emit(action, data);

	return cfsObject;
}	

function CFSObject(){
	var obj = this;

	self.port.on(data.mid, function(err, data){
		if(err){
			obj.error(err)
		}
		else{
			obj.success(data);
		}
	});
}

CFSObject.prototype.on = function(action, callback){
	this[action] = callback;
	return this;
}

if (document.querySelector("head > meta[CFS = 'true']")){
	var ready = new CustomEvent('cfs',{
		detail: cfs,
	});
	doc.dispatchEvent(ready);
}


