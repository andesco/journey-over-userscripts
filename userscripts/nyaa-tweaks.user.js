// ==UserScript==
// @name          Nyaa - Tweaks
// @version       1.0.0
// @description   Redirects to English-translated anime and formats timestamps in 12-hour time.
// @author        Journey Over
// @license       MIT
// @match         *://nyaa.si/*
// @grant         none
// @run-at        document-start
// @icon          https://www.google.com/s2/favicons?sz=64&domain=nyaa.si
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/nyaa-tweaks.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/nyaa-tweaks.user.js
// ==/UserScript==

(function() {
  'use strict';

  // --------------------------------------------------------
  // 1. Auto-Filter to English Translated Category
  // --------------------------------------------------------
  function enforceEnglishFilter() {
    const url = new URL(window.location.href);
    const category = url.searchParams.get('c');

    // Redirect only if in "All (0_0)" or "Anime – All (1_0)"
    if (category === '0_0' || category === '1_0') {
      url.searchParams.set('c', '1_2');
      window.location.replace(url.toString());
    }
  }

  // --------------------------------------------------------
  // 2. Timestamp Conversion (24h -> 12h)
  // --------------------------------------------------------
  function convertTo12Hour(timestamp) {
    const [date, time] = timestamp.split(' ');
    let [hours, minutes] = time.split(':').map(Number);

    const period = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;

    return `${date} ${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  function updateTimestamps() {
    document.querySelectorAll('td.text-center').forEach(td => {
      const text = td.textContent.trim();
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(text)) {
        td.textContent = convertTo12Hour(text);
      }
    });
  }

  function observeTimestamps() {
    updateTimestamps();
    const observer = new MutationObserver(updateTimestamps);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // --------------------------------------------------------
  // Init
  // --------------------------------------------------------
  enforceEnglishFilter();
  window.addEventListener('DOMContentLoaded', observeTimestamps);

})();
