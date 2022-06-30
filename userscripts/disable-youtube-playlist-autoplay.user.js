// ==UserScript==
// @name          Disable Youtube playlist autoplay
// @namespace     https://github.com/StylusThemes/Userscripts
// @description   Disables Youtube playlist autoplay
// @match         *://*.youtube.com/*
// @version       1.0
// @grant         none
// ==/UserScript==

(new MutationObserver(disableAutoplay)).observe(document.querySelector('ytd-app'), {childList: true, subtree: false});
disableAutoplay();

function disableAutoplay() {
  if(document.querySelector('yt-playlist-manager')) {
    document.querySelector('yt-playlist-manager').canAutoAdvance_ = false;
  }
}
