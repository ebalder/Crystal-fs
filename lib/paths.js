
var { indexedDB, IDBKeyRange } = require('sdk/indexed-db');
var widgets = require("sdk/widget");


exports.checkDB = function () {
	var conn = indexedDB.open("domain-paths", "2");

	conn.onupgradeneeded = function(event) {
		console.log('The database needs to be upgraded');
		var db = event.target.result;

		db.onerror = function(event) {
			console.error('Error opening database.');
			return;
		};

		db.onabort = function(event) {
			console.error('Database opening aborted!');
			return;
		};
		if(!db.objectStoreNames.contains('domain-paths')) {
			console.log('Upgrading Database...');
			var store = db.createObjectStore('domain-paths', {keyPath:'domain'});
			store.createIndex("paths", "paths", { unique: false });
			store.createIndex("domain", "domain", { unique: false });
			db.close();

			return;
		}

		db.onversionchange = function(event) {
			console.log('The database version has been updated; you should refresh this browser window.');
			return;
		};
	};

	return;
}

function open (callback) {

	var conn = indexedDB.open("domain-paths", "1");

	conn.onsuccess = function(ev) {
		db = ev.target.result;
		db.onerror = function(ev) {
			console.error(ev.value);
			db.close();
			return;
		}
		callback(db);

		return;
	};
}

exports.addPath = function addPath(path, domain, callback) {

	function lookup(db){
		var trans = db.transaction(['domain-paths'], "readwrite")
			.objectStore('domain-paths')
		var get = trans.get(domain);
		get.oncomplete = function(){
			write(trans, get, db);
		};
		get.onerror = function(ev) {
			console.error('Transaction failed: ', ev.value);
			db.close();
			callback(false);
		};
		return;
	}

	function write(trans, get, db){

		var key = Date.now();
		var res = get.result || {};
		var paths = res.paths || {};

		if(res){
			console.log('Domain found, looking for dups...');
			var k;
			for(k in paths){
				if(paths[k] == path){
					delete paths[k];
					break;
				}
			}
		}
		else{
			console.log('Domain not found, creating...');
			res.domain = domain;
			res.paths = paths;
		}

		paths[key] = path;
		console.log(res);
		update = trans.put(res);

		update.oncomplete = function(){
			db.close();
			callback(key);
		};
		update.error = function(ev) {
			console.error('Transaction failed: ', ev.value);
			db.close();
			callback(false);
		};
		
		return;

	}

	open(lookup);

	return;
};

exports.hasPath = function hasPath(key, domain, callback) {

	function check (paths) {

		if(paths && paths[key]){
			console.log('Path found');
			callback(paths[key]);
		}
		else{
			callback(false);
		}

		return;
	}

	// function lookup (db) {

	// 	var trans = db.transaction(['domain-paths'], "readonly")
	// 		.objectStore('domain-paths');
	// 	var get = trans.get(domain);

	// 	get.onsuccess = function(ev) {
	// 		var res = get.result;
	// 		var paths = res.paths;
	// 		if(res && paths[key]){
	// 			console.log('Path found');
	// 			db.close();
	// 			callback(paths[key]);
	// 		}
	// 		else{
	// 			db.close();
	// 			callback(false);
	// 		}
	// 	};

	// 	get.onerror = function(ev) {
	// 		console.error('Lookup failed: ', ev.value);
	// 		db.close();
	// 		callback(false);
	// 	};
	// 	return;
	// }

	getDomainPaths(domain, check);

	return;
};

exports.revoke = function revoke(domain, key, callback){
		
	function remove (db) {

		var trans = db.transaction(['domain-paths'], "readwrite")
			.objectStore('domain-paths');
		var get = trans.get(domain);

		get.onsuccess = function(ev) {
			console.log('Removing...');
			var res = get.result;
			var paths = res.paths;
			if(paths[key]){
				delete paths[key];
			}
			var update = trans.put(res);
			update.onsuccess = function(){
				db.close();
				callback();
			}
			update.onerror = function(ev) {
				console.error('Transaction failed: ', ev.value);
				db.close();
				callback(ev.value);
			};
			return;
		};

		get.onerror = function(ev) {
			console.error('Transaction failed: ', ev.value);
			db.close();
			callback(ev.value);
		};
		return;
	}

	open(remove);

	return;
}

exports.getDomainPaths = function getDomainPaths(domain, callback){
	open(getList);
			
	function getlist (db) {

		var trans = db.transaction(['domain-paths'], "readonly")
			.objectStore('domain-paths');
		var get = trans.get(domain);

		get.onsuccess = function(ev) {
			var res = get.result;
			db.close();
			if (res) {
				callback(res.paths);
			}
			else{
				callback(false);
			}
			return;
		};

		get.onerror = function(ev) {
			console.error('Transaction failed: ', ev.value);
			db.close();
			callback(ev.value);
		};
		return;
	}
	return;
}

exports.getDomains = function getDomains(offset, limit, callback){
	open(getall);
			
	function getlist (db) {

		var domains = [];

		var keyRange = IDBKeyRange.bound(offset, limit);
		var trans = objectStore.openCursor(keyRange);

		trans.onsuccess = function(ev) {
			var cursor = ev.target.result;
			if (cursor) {
				domains.push(cursor.value);
				cursor.continue();
			}
			return;
		};

		trans.oncomplete = function(ev) {
			console.log('Finished getting domains');
			db.close();
			callback(domains);
		};

		trans.onerror = function(ev) {
			console.error('Transaction failed: ', ev.value);
			db.close();
			callback(ev.value);
		};
		return;
	}
	return;
}