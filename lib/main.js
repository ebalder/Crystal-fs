
var data = require("sdk/self").data;
var pageMod = require("sdk/page-mod");
var widgets = require("sdk/widget");
var tabs = require("sdk/tabs");
var panel = require("sdk/panel");

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
var window = ww.activeWindow;
var cfsWorker;
var paths = [];

var cfs = pageMod.PageMod({
  include: "*",
  contentScriptFile: data.url("cfs-embed.js"),
  onAttach: portEvents
});

var prompt = panel.Panel({
	height: 400,
	contentURL: data.url('select-file.html'),
	contentScriptFile: data.url('select-file.js'),
	onShow: function(){}
});
var widget = widgets.Widget({
	id: "mozilla-link",
	 label: "Mozilla website",
	 contentURL: "http://www.mozilla.org/favicon.ico",
	 onClick: function() {
	   tabs.open("http://localhost:8000/FF-addons/TestPage/");
	}
});

function portEvents(worker) {
	cfsWorker = worker;
	worker.port.on('open-file', function(data) {
		var dir = FileUtils.getDir("Home", [data], true, true);
	});
	worker.port.on('prompt-file', function(data){
		filePicker.init(window, 'Select a working path', Ci.nsIFilePicker[data.mode]);
		if(data.filter != 'filterAll'){
			filePicker.appendFilter(data.filterLabel, data.filter);
			filePicker.appendFilters(data.filterLabel);
		}
		data.mode == 'modeOpenMultiple' 
			? filePicker.open(setMulti) 
			: filePicker.open(setPath);
		return 0;
	});
	worker.port.on('save-file', function(data){
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
		NetUtil.asyncFetch(input, writeData);
		function writeData (input) {
			NetUtil.asyncCopy(input, output, notify('wrote'));
		}
	});
	
}

function setPath(data) {
	if(data === 0){
		var file = filePicker.file.path;
		paths[file] = filePicker.file;
		cfsWorker.port.emit('set-path', file);
	}
}
function setMulti(data) {
	if(data === 0){
		var files = filePicker.files;
		// worker.port.emit('files', files);
	}
	
}
function notify(emit){
	cfsWorker.port.emit(emit);
}
function writeData (data) {
	NetUtil.asyncCopy(input, output, notify('wrote'));
}