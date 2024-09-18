// ==UserScript==
// @name          GitHub - Cleanup
// @version       1.0.1
// @description   Remove unwanted elements from GitHub pages
// @author        Journey Over
// @license       MIT
// @match         *://github.com/*
// @grant         GM_addStyle
// @icon          https://www.google.com/s2/favicons?sz=64&domain=github.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/github-remove-symbols-pane.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/github-remove-symbols-pane.user.js
// ==/UserScript==

(function() {
  'use strict';

  // Hide the specified elements using CSS
  GM_addStyle('div:has(> #symbols-pane), .code-navigation-cursor, .lbQLdc { display: none !important; }');
})();
