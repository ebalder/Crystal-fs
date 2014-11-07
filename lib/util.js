

var {promised} = require('sdk/core/promise');
var paths = require("./paths");

exports.getAddr = function getAddr(data, domain){
    function promise (resolve, reject){
        var domain = data.domain.match(/\/\/([^:\/?#]*)/)[1];

        paths.hasPath(data.pathKey, domain)
        .then(function(addr){
            if (path instanceof 'Array'){
                for(var i=0; i < data.path.length; i++){
                    addr = OS.Path.join(addr, data.path[i]);
                }
            }
            else{
                addr = OS.Path.join(addr, data.path);
            }
            resolve(addr);
        });
    }
    return new Promise(promise);
}