

var {promised} = require('sdk/core/promise');
var window = require("sdk/window/utils").getMostRecentBrowserWindow();
var paths = require("./paths");
var StringView = require('./stringView').class;

var {Cu, Ci, Cc} = require('chrome');
Cu.import("resource://gre/modules/osfile.jsm");
fp = Ci.nsIFilePicker;
var filePicker = Cc["@mozilla.org/filepicker;1"]
    .createInstance(fp);

exports.decode = function decode(input, encoding){
    function promise(resolve, reject){
        var out;
        if (['utf-8', 'utf-16', 'utf-32', 'ascii'].indexOf(encoding) > -1){
            out = new StringView(input, encoding.toUpperCase());
            resolve(out.toString());
        }
        else if (encoding == 'base64'){
            out = new StringView(input);
            out = out.toBase64(true);
            resolve(out);
        }
        else if ([null, 'uint8'].indexOf(encoding) > -1){
            // return byte array;
            resolve(input);
        }
        else{
            /* ToDo: handle error */
            reject(new Error('The specified encoding is not supported.'));
        }
    }

    return new Promise(promise);
};

exports.getAddr = function getAddr(data, url){
    function promise (resolve, reject){
        var domain = url.match(/\/\/([^:\/?#]*)/)[1];

        paths.hasPath(data.pathKey, domain)
        .then(function(addr){
            OS.File.stat(addr)
            .then(function(info){
                var path = data.path;
                if(info.isDir){
                    /* follow the given path */
                    if (Array.isArray(path)){
                        for(var i=0; i < data.path.length; i++){
                            addr = OS.Path.join(addr, data.path[i]);
                        }
                    }
                    else{
                        addr = OS.Path.join(addr, data.path);
                    }
                    resolve(addr);
                }
                else{
                    /* not a dir, do nothing with the path */
                    resolve(addr);
                }
            });
        });
    }
    return new Promise(promise);
};

exports.promptPath = function promptPath(data){
    function promise(resolve, reject){
        data = data || {};
        data.mode = data.mode || 'modeGetFolder';
        filePicker.init(window, 'Select a working path for this application', fp[data.mode]);
        if(data.filter){
            filePicker.appendFilter(data.filterLabel, data.filter);
            filePicker.appendFilters(data.filterLabel);
        }
        filePicker.open(function(res){
            if(res === 0){
                if(data.mode == 'modeOpenMultiple'){
                    var files = filePicker.files;
                    var paths;
                    for(var i=0; i < files.length; i++){
                        paths[i] = files[i].paths;
                    }
                    resolve(paths);
                }
                else{
                    resolve(filePicker.file.path);
                }
            }
        });
    }

    return new Promise(promise);
};