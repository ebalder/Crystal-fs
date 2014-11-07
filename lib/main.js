
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
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
Cu.import("resource://gre/modules/Promise.jsm");
Cu.import("resource://gre/modules/osfile.jsm");

var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
    .createInstance(Ci.nsIScriptableUnicodeConverter);
var ioService = Cc["@mozilla.org/network/io-service;1"]
    .getService(Ci.nsIIOService);
var iStream = Cc["@mozilla.org/network/file-input-stream;1"]
    .createInstance(Ci.nsIFileInputStream);
var iBinStream = Cc["@mozilla.org/binaryinputstream;1"]
    .createInstance(Ci.nsIBinaryInputStream);



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
        getTree(data, worker);
    });

    /* read file contents. data attributes are:
    *  - pathKey: (int) If not set, prompt the user for a file to read
    *  - path: (string) path+filename to read under the pathKey (if set). Without leading slash.
    *  response event: file-opened
    *  response data: Blob,b64,UTF-8,ASCII content
    *  error cases: 
    *  - revoked/unexistent pathKey
    *  - path giben is not a file
    */
    worker.port.on('open-file', function(data) {
        openFile(data, worker); 
    });

    /* give permision to the given subdomain.domain to a directory/file, 
    *  data attributes are:
    *  - mode: (string) ModeGetFolder | ModeGetMultiple 
    *  - defaultName: (string) if selecting a file
    *  - defaultExt: (string) if selecting a file, without leading dot
    *  - filter: (string) example '*.jpg; *.png' 
    *  - filterLabel: img | audio | video | media | plaintxt 
    *  response event: path-set
    *  response data: int pathKey
    *  error cases: 
    *  - invalid filter
    *  - invalid filename
    *  - invalid mode
    */
    worker.port.on('set-path', function(data){
        setPath(data, worker);
    });

    /* data attributes are:
    *  - data: (Blob,b64,UTF-8,ASCII) content to save
    *  - pathKey: (int) if not set, prompt the user for a path
    *  - filename: (string) if not set, prompt the user for a path
    *  ToDO: encoding types */
    worker.port.on('save-file', function(data){
        saveFile(data, worker);
    });

    /* Get permitted paths for this domain */
    worker.port.on('get-paths', function(data){
        getPaths(data, worker);
    });
    return;
}

function getPaths (data, worker) {
    var domain = worker.url.match(/\/\/([^\/?]*)/)[1];
    paths.getDomainPaths(domain, function(err, paths){
        console.log(paths);
        worker.port.emit(data.mid, err, paths);
    });
}
function getTree(data, worker){
    var limit = data.limit || 3;
    var start = data.start || '';
    var level = 0;

    function branch(dir){
        dir.followLinks = true;
        var files = dir.directoryEntries;
        var curr;
        var ret = [];
        while(files.hasMoreElements()){
            curr = files.getNext().QueryInterface(Ci.nsIFile);
            if(curr.isDirectory()){
                var newBranch = {};
                level++;
                if(level < limit){
                    newBranch[curr.leafName] = branch(curr);
                }
                else {
                    newBranch[curr.leafName] = {};
                }
                level--;
                ret.push(newBranch);
            }
            else{
                ret.push(curr.leafName);
            }
        }
        return ret;
    }

    if(data.pathKey){
        paths.hasPath(data.restore, function(path){
            var pathArray = [path];
            pathArray.concat(start.split('/'));
            /* rootkey, path array, should create, follow links */
            var dir = new FileUtils.getDir('Home', pathArray, false, true);
            if(dir.isDirectory){
                branch(dir);
            }
            else{
                worker.port.emit(data.mid, null, 'Path is not a directory');
            }
        });
    }
    else {
        promptPath({}, function (res) {
            if(res === 0){
                worker.port.emit(data.mid, null, branch(filePicker.file));
            }
        });
    }
}

function openFile (data, worker) {
    data = data || {};
    var file;

    function read(file){
        OS.File.read(file)
        .then(function(a){
            console.log('file read!!!');
            console.log(a);
        });
        // NetUtil.asyncFetch(file, function(inputStream, status) {
        //     if (!components.isSuccessCode(status)) {
        //         Cu.reportError('error on file read isSuccessCode = ' + status);
        //         worker.port.emit(data.mid, status, null);
        //     }
        //     else{
        //         var stream;
        //         switch(data.type){
        //             case 'b64': 
        //                 stream = NetUtil.readInputStreamToString(inputStream, inputStream.available());
        //                 stream = window.btoa(stream) || stream;
        //                 break;
        //             case 'bin': 
        //                 stream = NetUtil.readInputStreamToString(inputStream, inputStream.available());
        //                 steam = window.atob(stream) || stream;
        //                 break;
        //             case 'utf-8':
        //                 stream = NetUtil.readInputStreamToString(inputStream, inputStream.available(), {charset:'utf8'});
        //                 break;
        //             case 'ascii':
        //                 stream = NetUtil.readInputStreamToString(inputStream, inputStream.available(), {charset:'ascii'});
        //                 break;
        //             default:
        //                 stream = NetUtil.readInputStreamToString(inputStream, inputStream.available(), {charset:'ascii'});
        //         }
        //         worker.port.emit(data.mid, null, stream);
        //     }
        //     return;
        // });
    }

    if(data.pathKey){
        util.getAddr(data, worker.url)
        .then(read);
    }
    else{
        util.promptPath({mode:'ModeOpen'})
        .then(read);
    }
    return;
}

function saveFile(data, worker){
    console.log('data', data);

    if(!data.path || data.pathkey){
        data.save = true;
        promptPath(data, function(res){
            var path = setPath(res);
            if(path){
                data.path = path;
                saveFile(data);
            }
        });
    }
    else {
        if(!paths[data.path]){
            /* ToDo: numeric error codes */
            worker.port.emit(data.mid, 'Denied access to path: ' + data.path);
        }
        var file = paths[data.path].clone();
        if(file.isDirectory()){
            file.append(data.file);
            if(!file.exists()){
                file.create('NORMAL_FILE_TYPE', 0600);
            }
        }
        var output = FileUtils.openSafeFileOutputStream(file);
        // converter.charset = "UTF-8";
        // var input = converter.convertToInputStream(data.data);
        var input = ioService.newURI(data.data, null, null);
        NetUtil.asyncFetch(input, function(input){
            NetUtil.asyncCopy(input, output, function(err, data){
                worker.port.emit(data.mid, err, data);
            });
        });
    }
}

function setPath(data, worker) {
    function register (data) {
        var domain = worker.url.match(/\/\/([^:\/?#]*)/)[1];;
        if(data === 0){
            var file = filePicker.file.path;
            paths.addPath(file, domain, 
                function(pathKey){
                    worker.port.emit(data.mid, null, pathKey);
                }
            );
        }
        return;
    }
    promptPath(data, register);
    
    return;
}

function notify(emit, data){
    cfsWorker.port.emit(emit, data);
}


} // start
