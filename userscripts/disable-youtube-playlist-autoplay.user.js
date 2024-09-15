// ==UserScript==
// @name          Disable Youtube playlist autoplay
// @version       1.0.0
// @description   Disables Youtube playlist autoplay
// @author        Journey Over
// @license       MIT
// @match         *://*.youtube.com/*
// @grant         none
// @icon          https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/disable-youtube-playlist-autoplay.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/disable-youtube-playlist-autoplay.user.js
// ==/UserScript==

(new MutationObserver(disableAutoplay)).observe(document.querySelector('ytd-app'), {childList: true, subtree: false});
disableAutoplay();

function disableAutoplay() {
  if(document.querySelector('yt-playlist-manager')) {
    document.querySelector('yt-playlist-manager').canAutoAdvance_ = false;
  }
}
