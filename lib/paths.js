
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
			console.log('Upgrading Database...')
			var store = db.createObjectStore('domain-paths', {keyPath:'key'});
			store.createIndex("path", "path", { unique: false });
			store.createIndex("domain", "domain", { unique: false });
			store.createIndex("type", "type", { unique: false });
			store.createIndex("key", "key", { unique: true });
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

	open(write);
	
	function write (db) {

		var key = Date.now();
		var trans = db.transaction(['domain-paths'], "readwrite")
			.objectStore('domain-paths')
			.put({
				path: path,
				domain: domain,
				key: key
			});

		trans.oncomplete = function(ev) {
			console.log('Path added successfully');
			db.close();
			callback(key);
		};

		trans.onerror = function(ev) {
			console.error('Transaction failed: ', ev.value);
			db.close();
			callback(key);
		};
		return;
	}
	return;
};

exports.hasPath = function hasPath(key, domain, callback) {
	open(lookup);
		
	function lookup (db) {

		var trans = db.transaction(['domain-paths'], "readonly")
			.objectStore('domain-paths')
			.get(key);

		trans.oncomplete = function(ev) {
			if(trans.result.domain === domain){
				console.log('Path found');
				callback(trans.result.path);
				return;
			}
			db.close();
			callback(false);
		};

		trans.onerror = function(ev) {
			console.error('Lookup failed: ', ev.value);
			db.close();
			callback(false);
		};
		return;
	}
	return;
};

exports.revoke = function revoke(key, callback){
	open(delete);
		
	function delete (db) {

		var trans = db.transaction(['domain-paths'], "readwrite")
			.objectStore('domain-paths')
			.delete(key);

		trans.oncomplete = function(ev) {
			console.log('Path removed');
			db.close();
			callback();
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

exports.getList = function getList(domain, offset, limit, callback){
	open(getall);
			
	function getlist (db) {

		var paths = [];

		var keyRange = IDBKeyRange.bound(offset, limit);
		objectStore.openCursor(keyRange).onsuccess = function(ev) {
			var cursor = ev.target.result;
			if (cursor && (!domain || domain == cursor.value.domain)) {
				paths.push(cursor.value);
				cursor.continue();
			}
			return;
		};

		trans.oncomplete = function(ev) {
			console.log('Finished getting paths');
			db.close();
			callback(paths);
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