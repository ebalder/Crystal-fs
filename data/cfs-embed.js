
var emit = self.port.emit;
var doc = document.documentElement;
var mid = 0; //message id

var cfs = function cfs(action, data, success, error){
    data = data || {};
    data.mid = '' + mid;
    mid++;

    var cfsObject = new CFSObject(action, data);

    cfsObject.success = success || function(){};
    cfsObject.error = error || function(){};

    emit(action, data);

    return cfsObject;
}   

function CFSObject(action, data){
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

if (document.querySelector("html[data-cfs='true']") != null){
    var ready = new CustomEvent('cfs');
    /* ToDo: for some reason, passing the detail to the constructor didn't work
     * a bug? will maybe have to be changed later 
     */
    ready.detail = cfs;
    doc.dispatchEvent(ready);
}


