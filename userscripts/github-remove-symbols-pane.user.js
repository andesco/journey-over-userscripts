// ==UserScript==
// @name          GitHub - Cleanup
// @version       1.0.2
// @description   Remove unwanted elements from GitHub pages
// @author        Journey Over
// @license       MIT
// @match         *://github.com/*
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@5f2cbff53b0158ca07c86917994df0ed349eb96c/libs/gm/gmcompat.js
// @grant         GM.addStyle
// @icon          https://www.google.com/s2/favicons?sz=64&domain=github.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/github-remove-symbols-pane.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/github-remove-symbols-pane.user.js
// ==/UserScript==

(function() {
  'use strict';

  // Hide the specified elements using CSS
  GMC.addStyle('div:has(> #symbols-pane), .code-navigation-cursor, .lbQLdc { display: none !important; }');
})();
