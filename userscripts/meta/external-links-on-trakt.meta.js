// ==UserScript==
// @name          External links on Trakt
// @version       1.0.0
// @description   Add more external links on Trakt
// @author        Journey Over
// @license       MIT
// @match         *://trakt.tv/*
// @require       https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.min.js
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@main/libs/utils/index.min.js?version=1.0.0
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@main/libs/wikidata/index.min.js?version=1.0.0
// @require       https://cdn.jsdelivr.net/npm/node-creation-observer@1.2.0/release/node-creation-observer-latest.min.js
// @require       https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM.deleteValue
// @grant         GM.getValue
// @grant         GM.listValues
// @grant         GM.registerMenuCommand
// @grant         GM.setValue
// @grant         GM.xmlHttpRequest
// @run-at        document-start
// @inject-into   content
// @icon          https://www.google.com/s2/favicons?sz=64&domain=trakt.tv
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/external-links-on-trakt.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/external-links-on-trakt.user.js
// ==/UserScript==

/* global $, GM_config, NodeCreationObserver, UserscriptUtils, Wikidata */
