
var {Cu, Ci, Cc, Cr, components} = require('chrome');
Cu.import("resource://gre/modules/DeferredTask.jsm");
var defer = new DeferredTask(start, 1).arm();

function start(){


/* ============================= Modules ================================= */

var data = require("sdk/self").data;
var pageMod = require("sdk/page-mod");
var ui = require("sdk/ui");
var tabs = require("sdk/tabs");
var paths = require("./paths");
var util = require("./util");

/* ============================== Chrome ================================= */

var {Cu, Ci, Cc, Cr, components} = require('chrome');
Cu.import("resource://gre/modules/Promise.jsm");
Cu.import("resource://gre/modules/osfile.jsm");

/* ====================================================================== */

paths.checkDB();

/* Embed API */
var cfs = pageMod.PageMod({
    include: "*",
    contentScriptFile: data.url("cfs-embed.js"),
    attachTo: ['existing', 'frame', 'top'],
    onAttach: portEvents
});

/* for dev only: click it to go to the testPage */
var button = ui.ActionButton({
    id: "demo",
    label: "CFS demo",
    icon: "./pug.png",
    onClick: function() {
       tabs.open("http://localhost:8000/demo");
    }
});

function portEvents(worker) {

    /* gets the structure of the currently active path. attributes of 
    *  the data object are optional:
    *  - pathKey: (int) If not set, prompt the user for a path.
    *  - dept: (int) limit the dept to explore, defaults to 3.
    *  - start: (string) set a path where the exploration begins, default to the restore
    *    value. Starts without leading slash.
    *  response event: got-tree
    *  response data: Array tree || false
    *  error cases: 
    *  - revoked/unexistent pathKey
    *  - path given is not a directory
    */
    worker.port.on('get-tree', function(data){
        getTree(data, worker)
        .then(function(tree){
            worker.port.emit(data.mid, null, tree);
        });
    });

    /* read file contents. data attributes are:
    *  - pathKey: (int) If not set, prompt the user for a file to read
    *  - path: (string) path+filename to read under the pathKey (if set). Without leading slash.
    *  response data: base64, utf-8/16/32, ascii, uint8 content
    *  error cases: 
    *  - revoked/unexistent pathKey
    *  - path giben is not a file
    */
    worker.port.on('open-file', function(data) {
        openFile(data, worker)
        .then(function(out){
            worker.port.emit(data.mid, null, out);
        }); 
    });

    /* give permision to the given subdomain.domain to a directory/file, 
    *  data attributes are:
    *  - mode: (string) ModeGetFolder | ModeGetMultiple 
    *  - defaultName: (string) if selecting a file
    *  - defaultExt: (string) if selecting a file, without leading dot
    *  - filter: (string) example '*.jpg; *.png' 
    *  - filterLabel: img | audio | video | media | plaintxt
    *  response data: int pathKey
    *  error cases: 
    *  - invalid filter
    *  - invalid filename
    *  - invalid mode
    */
    worker.port.on('set-path', function(data){
        setPath(data, worker)
        .then(function(key){
            worker.port.emit(data.mid, null, key);
        });
    });

    /* data attributes are:
    *  - data: (Blob,b64,UTF-8,ASCII) content to save
    *  - pathKey: (int) if not set, prompt the user for a path
    *  - filename: (string) if not set, prompt the user for a path
    *  ToDO: encoding types */
    worker.port.on('save-file', function(data){
        saveFile(data, worker).
        then(function(key){
            worker.port.emit(data.mid, null, key);
        });
    });

    /* Get permitted paths for this domain */
    worker.port.on('get-paths', function(data){
        getPaths(data, worker).
        then(function(keys){
            worker.port.emit(data.mid, null, keys);
        });
    });
    return;
}

function getPaths (data, worker) {
    function promise(resolve, reject){
        var domain = worker.url.match(/\/\/([^:\/?#]*)/)[1];
        paths.getDomainPaths(domain)
        .then(resolve);
    }

    return new Promise(promise);
}
function getTree(data, worker){
    var limit = data.limit || 3;
    var start = data.start || '';
    var level = 0;

    function promise(resolve, reject){

        if(data.pathKey){
            util.getAddr(data, worker.url)
            .then(branch)
            .then(resolve);
        }
        else {
            util.promptPath(data)
            .then(branch)
            .then(resolve);
        }
    }

    function branch(dir){
        function promise(resolve, reject){
            var ret = {};
            var iterator = new OS.File.DirectoryIterator(dir, data);
            iterator.forEach(function(entry){
                /* ToDo: is it convenient to follow symlinks? */
                if(entry.isSymLink){
                    return;
                }
                if(entry.isDir){
                    if (level < limit){
                        level ++;
                        return branch(entry.path)
                        .then(function(branch){
                            ret[entry.name] = branch;
                        });
                    }
                    else{
                        ret[entry.name] = {};
                    }
                }
                else{
                    ret[entry.name] = '';
                }
            })
            .then(function(){
                level --;
                iterator.close();
                resolve(ret);
            });
        }

        return new Promise(promise);
    }

    return new Promise(promise);
}

function openFile (data, worker) {
    function promise (resolve, reject){
        data = data || {};

        function read(file){
            OS.File.read(file)
            .then(function(out){
                return util.decode(out, data.encoding);
            })
            .then(resolve);
        }

        if(data.pathKey){
            util.getAddr(data, worker.url)
            .then(read);
        }
        else{
            util.promptPath({mode:'ModeOpen'})
            .then(read);
        }
    }

    return new Promise(promise);
}

function saveFile(data, worker){
    function promise(resolve, reject){
        data = data || {};

        function write(file){
            util.encode(data.content, data.encoding)
            .then(function(out){
                return OS.File.writeAtomic(file, out);
            })
            .then(function(res){
                resolve(res);
            });
        }

        if(data.pathKey){
            util.getAddr(data, worker.url)
            .then(write);
        }
        else {
            data.mode = 'modeSave';
            util.promptPath(data)
            .then(write);
        }  
    }

    return new Promise(promise);
}

function setPath(data, worker) {
    function promise(resolve, reject){
        function register (path) {
            var domain = worker.url.match(/\/\/([^:\/?#]*)/)[1];
            paths.addPath(path, domain)
            .then(resolve);
        }

        util.promptPath(data, register)
        .then(register);
    }

    return new Promise(promise);
}

function notify(emit, data){
    cfsWorker.port.emit(emit, data);
}


} // start
