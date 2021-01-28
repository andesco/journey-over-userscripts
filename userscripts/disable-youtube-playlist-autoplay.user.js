// ==UserScript==
// @name        Disable Youtube playlist autoplay
// @include     http://*.youtube.com/*
// @include     https://*.youtube.com/*
// @version     1
// @grant       none
// ==/UserScript==

(new MutationObserver(disableAutoplay)).observe(document.querySelector('ytd-app'), {childList: true, subtree: false});
disableAutoplay();

function disableAutoplay() {
  if(document.querySelector('yt-playlist-manager')) {
    document.querySelector('yt-playlist-manager').canAutoAdvance_ = false;
  }
}