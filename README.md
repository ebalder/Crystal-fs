# Crystal-fs
Addon which lets you perform client-side filesystem transactions from your web application

You can help with the development, improvement and mantainance of more software by **donating** to my [patreon account](http://patreon.com/lexas). Thanks!.

#About
This addon is meant to make possible web applications that work simultaneously with multiple local files. It's currently for firefox becase it was the only one with a more or less stable specification for addon-powered filesystem access.

Compatibility with more browsers to come. There is a chance that a [filesystem API specification](http://dev.w3.org/2009/dap/file-system/pub/FileSystem/) gets reconsidered for modern browsers. 

Google Chrome already has a [working implementation](https://developer.chrome.com/apps/fileSystem) of a Filesystem API which possibly works [also on Opera](https://developer.mozilla.org/en-US/docs/WebGuide/API/File_System#Browser_compatibility). So a very big userbase is already covered on that front and I find it pointless to keep making more versions for more browsers until it's demanded.

#Download
For Firefox: https://addons.mozilla.org/en-US/firefox/addon/crystal-fs/?src=search

#Usage

Add `data-cfs="true"` to the `<html>` tag:

``` <html data-cfs='true'> ```

Might be convenient to wait for the API to be exposed to the application:
```
document.documentElement.addEventListener('cfs-ready', function(ev){
	//initialize
}
```

##set-path
Prompts the user for a file or folder to give transparent access to, sets that path to a pathKey (so the external path is not exposed to the app) and returns it for future access.
```
fsTransaction('set-path', {
	mode: 'modeGetFolder',
	filterLabel: 'custom'
}, function(pathKey){
	console.log('Setting path key %s: ', pathKey);
	localStorage.pathKey = pathKey; //keep the path key for further usage
});
```

##get-tree
get the file tree with a dept of 3 levels of the given *pathKey*, otherwise, prompt the user for a directory, set the pathKey for the given directory and get the tree.

The resulting object has the following structure:
```
{
	'a_folder': {
		'a-file.txt',
		'an-image.png',
		'another_folder': {
			...
		}
	},
}
```

example:
```
fsTransaction('get-tree', {}, function(tree){
	localStorage.tree = tree;
});
```

##save-file
Writes a file on the given pathKey, otherwise prompts the user for the path, saves the file, and sets the pathKey.
```
fsTransaction('save-file', {
	content: URI,
	encoding: 'base64',
	pathKey: localStorage.pathKey,
	path: ['save']
}, function(key){
	localStorage.pathKey = pathKey;
});
```

##open-file
Get the content of a file with a given encoding. This option won't set a pathKey and you won't get transparent access for the given file.

```
fsTransaction('open-file', {
	encoding: 'base64'
}, function(data){
	var img = new Image();
	img.onload = function(ev){
		var container = document.getElementById('image');
		container.appendChild(img);
	};
	img.src = 'data:;base64,'+data;
});
```

##load-file
Get the content of a file under the given pathKey without asking the user, otherwise, prompt the user to set a working path before looking for the file. The internal path is given as an array.

example:
```
fsTransaction('load-file', {
	encoding:'base64',
	pathKey:localStorage.pathKey,
	path:['lib','pug.png']
}, function(data){
	var img = new Image();
	img.onload = function(ev){
	    var container = document.getElementById('image');
	    container.appendChild(img);
	};
	img.src = 'data:;base64,'+data;
});
```

##get-paths
Get an Array containing the valid patKeys for the current origin.
```
fsTransaction('get-paths', null, function(data){
	localStorage.paths = data;
});
```

##valid encoding types are:
-utf-8
-utf-16
-utf-32
-ascii
-base64
-uint8 (binary)

##valid prompt modes are:
- modeGetFolder
- modeOpenMultiple

##filtering filetypes:
When you call a prompt action, you can pass a string of semicolon-separated wildcard-like file extention matches: `[*.txt;*.png]`.

Or you can use predefined (String) filters by file type: 
*allFilter = '
- htmlFilter = '*.html; *.htm; *.shtml; *.xhtml'
- textFilter = '*.txt; *.text'
- imageFilter = '*.jpe; *.jpg; *.jpeg; *.gif; *.png; *.bmp; *.ico; *.svg; *.svgz; *.tif; *.tiff; *.ai; *.drw; *.pct; *.psp; *.xcf; *.psd; *.raw'
- audioFilter = '*.aac; *.aif; *.flac; *.iff; *.m4a; *.m4b; *.mid; *.midi; *.mp3; *.mpa; *.mpc; *.oga; *.ogg; *.ra; *.ram; *.snd; *.wav; *.wma'
- videoFilter = '*.avi; *.divx; *.flv; *.m4v; *.mkv; *.mov; *.mp4; *.mpeg; *.mpg; *.ogm; *.ogv; *.ogx; *.rm; *.rmvb; *.smil; *.webm; *.wmv; *.xvid'


You can help with the development, improvement and mantainance of more software by donating to my [patreon account](http://patreon.com/lexas). Thanks!.


