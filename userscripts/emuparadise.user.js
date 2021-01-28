// ==UserScript==
// @name	EmuParadise Download Workaround
// @version	0.0.1
// @description	Replaces the download button link with a working one
// @author	strupo (based on Epton (https://gist.github.com/Eptun/3fdcc84552e75e452731cd4621c535e9/))
// @match	https://www.emuparadise.me/*/*/*
// @grant	none
// ==/UserScript==

(function() {
	'use strict';

	var id = encodeURIComponent(((document.URL).split('/'))[5]);
	var suf = '<a target="_blank" href="/roms/get-download.php'
		+ '?gid=' + id
		+ '&test=true"'
		+ ' title="Download using the workaround script">'
		+ 'Download using the workaround script</a>'
		+ '<br /><br />';
	Array.from(
		document.getElementsByClassName('download-link')
	).map(dl => {
		dl.innerHTML = suf + dl.innerHTML;
	});
})();