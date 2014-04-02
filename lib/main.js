
/* ============================= Modules ================================= */

var data = require("sdk/self").data;
var pageMod = require("sdk/page-mod");
var widgets = require("sdk/widget");
var tabs = require("sdk/tabs");
var panel = require("sdk/panel");
var paths = require("./paths");


/* ============================== Chrome ================================= */

var {Cu, Ci, Cc} = require('chrome');
Cu.import("resource://gre/modules/FileUtils.jsm");
Cu.import("resource://gre/modules/NetUtil.jsm");
var ww = Cc["@mozilla.org/embedcomp/window-watcher;1"]
	.getService(Ci.nsIWindowWatcher);
var filePicker = Cc["@mozilla.org/filepicker;1"]
	.createInstance(Ci.nsIFilePicker);
var converter = Cc["@mozilla.org/intl/scriptableunicodeconverter"]
	.createInstance(Ci.nsIScriptableUnicodeConverter);
var ioService = Cc["@mozilla.org/network/io-service;1"]
                  .getService(Ci.nsIIOService);


/* ====================================================================== */

var window = ww.activeWindow;

/* Embed API */
var cfs = pageMod.PageMod({
  include: "*",
  contentScriptFile: data.url("cfs-embed.js"),
  onAttach: portEvents
});

/* for dev only: click it to go to the testPage */
var widget = widgets.Widget({
	id: "mozilla-link",
	 label: "Mozilla website",
	 contentURL: "http://www.mozilla.org/favicon.ico",
	 onClick: function() {
	   tabs.open("http://localhost:8000/FF-addons/TestPage/");
	}
});

function portEvents(worker) {
	paths.checkDB();

	var on = worker.port.on;
	on('get-tree', function(data){
		getTree(data, worker);
	});
	on('open-file', function(data) {
		var dir = FileUtils.getDir("Home", [data], true, true);
	});
	on('set-path', function(data){
		setPath(data, worker);
	});
	on('save-file', function(data){
		saveFile(data, worker);
	});
	return;
}

function getTree(data, worker){
	var limit = data.limit || 3;
	var level = 0;

	function branch(dir){
		dir.followLinks = true;
		var files = dir.directoryEntries;
		var curr;
		var ret = [];
		while(files.hasMoreElements()){
			curr = files.getNext().QueryInterface(Ci.nsIFile);
			if(curr.isDirectory()){
				console.log('===', curr.leafName, level);
				var newBranch = {};
				level++;
				newBranch[curr.leafName] = level < limit ? branch(curr) : {};
				level--;
				ret.push(newBranch);
			}
			else{
				ret.push(curr.leafName);
			}
		}
		return ret;
	}

	if(data.restore){
		/* get from already approved folder for the current domain */
	}
	else {
		promptPath({}, function (res) {
			if(res === 0){
				notify('got-tree', branch(filePicker.file));
			}
		});
	}
}

function promptPath(data, callback){
	if(!data.mode){
		data.mode = 'modeGetFolder'
	}
	filePicker.init(window, 'Select a working path for this application', Ci.nsIFilePicker[data.mode]);
	if(data.filter){
		filePicker.appendFilter(data.filterLabel, data.filter);
		filePicker.appendFilters(data.filterLabel);
	}
	data.mode == 'modeOpenMultiple' 
		? filePicker.open(setMulti) 
		: filePicker.open(callback);
	return 0;
}
function saveFile(data, worker){
	if(!data.path){
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
			writeData(input, output);
		});
	}
}
function setPath(data, worker) {
	function register (data) {
		function respond (pathKey) {
			this.port.emit('path-set', pathKey);
		}
		var domain = worker.url.match(/\/[^\/\?]+\/?/)[0].match(/[^\/]+/)[0];
		console.log('////////////', domain);
		if(data === 0){
			var file = filePicker.file.path;
			paths.addPath(filePicker.file, domain, respond);
		}
		return;
	}
	promptPath(data, register);
	
	return;
}
function setMulti(data, worker) {
	if(data === 0){
		var files = filePicker.files;
		// worker.port.emit('files', files);
	}
	
}
function notify(emit, data){
	cfsWorker.port.emit(emit, data);
}
function writeData (input, output) {
	NetUtil.asyncCopy(input, output, notify('wrote', null));
}