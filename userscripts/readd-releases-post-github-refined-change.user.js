// ==UserScript==
// @name          Readd releases post Github Refined change
// @namespace     https://github.com/StylusThemes/Userscripts
// @description   Readds releases post Github Refined change
// @include       https://github.com/*
// @version       2.0
// @grant         none
// ==/UserScript==

//Check if it's main repo page. Works most of the time (except when ending in /, which doesn't happen by default)
regex = new RegExp('(^[^\/]*(\/[^\/]*){4}[^\/]$)');

window.addEventListener("load", function(event) {
  restoreReleases();
});

window.addEventListener("pjax:end", function(event) {
  restoreReleases();
});

function restoreReleases() {
  setTimeout(function() {
    if(!regex.test(location.href)){
      return;
    }
    console.log('Readding releases panel (removed by Github Refined)');
    const sideReleases = document.querySelector('.BorderGrid-cell a[href$="/releases"]');
    sideReleases.closest('.BorderGrid-row').hidden = false;
  }, 1);
}
