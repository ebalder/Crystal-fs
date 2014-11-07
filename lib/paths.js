
var { indexedDB, IDBKeyRange } = require('sdk/indexed-db');


exports.checkDB = function () {
    var conn = indexedDB.open("domain-paths", "1");

    conn.onupgradeneeded = function(event) {
        console.log('The database needs to be upgraded');
        var db = conn.result;

        db.onerror = function(event) {
            console.error('Error opening database.');
            db.close();
            return;
        };

        db.onabort = function(event) {
            console.error('Database opening aborted!');
            db.close();
            return;
        };
        if(!db.objectStoreNames.contains('domain-paths')) {
            console.log('Upgrading Database...');
            var store = db.createObjectStore('domain-paths', {keyPath:'domain'});
            store.createIndex("paths", "paths", { unique: false });
            store.createIndex("domain", "domain", { unique: false });
        }

        db.onversionchange = function(event) {
            db.close();
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
            console.error('Error opening database: ', ev.value);
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
                if(paths[k].path == path){
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

        paths[key] = {
            path: path,
            lastAccess: key
        };
        var update = trans.put(res);

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

exports.hasPath = function hasPath(key, domain) {

    function promise(resolve, reject){
        open()
        .then(function(db){
            var trans = db.transaction(['domain-paths'], "readwrite")
                .objectStore('domain-paths');
            var get = trans.get(domain);

            get.onsuccess = function(ev) {
                var res = get.result;
                var paths = res.paths;
                if(res && paths[key]){
                    console.log('Path found');
                    paths[key].lastAccess = Date.now();

                    var update = trans.put(res);
                    update.onerror = function(ev){
                        /* ToDo: handle error */
                        console.error('Update failed: ', ev.value);
                    }

                    db.close();
                    resolve(paths[key].path);
                }
                else{
                    db.close();
                    reject(new Error('Denied access'));
                }
            };

            get.onerror = function(ev) {
                console.error();
                db.close();
                reject(new Error('Lookup failed: ' +ev.value));
            };
        });
    }

    return new Promise(promise);
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
            
    function getList (db) {

        var trans = db.transaction(['domain-paths'], "readonly")
            .objectStore('domain-paths');
        var get = trans.get(domain);

        get.onsuccess = function(ev) {
            var res = get.result;
            db.close();
            if (res) {
                var paths = res.paths;
                var i;
                var keys = [];
                for (i in paths){
                    keys.push(i);
                }
                callback(null, keys);
            }
            else{
                callback('error getting domain registry');
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