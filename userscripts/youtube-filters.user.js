// ==UserScript==
// @name          YouTube - Filters
// @version       1.4.3
// @description   Filters YouTube videos by duration and age. Hides videos less than X seconds long or older than a specified number of years, excluding channel video tabs.
// @author        Journey Over
// @license       MIT
// @match         *://*.youtube.com/*
// @grant         GM_setValue
// @grant         GM_getValue
// @grant         GM_registerMenuCommand
// @run-at        document-body
// @icon          https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/youtube-filters.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/youtube-filters.user.js
// ==/UserScript==

(function() {
  'use strict';

  // Retrieve settings or use defaults
  const MIN_DURATION_SECONDS = GM_getValue('MIN_DURATION_SECONDS', 120);
  const AGE_THRESHOLD_YEARS = GM_getValue('AGE_THRESHOLD_YEARS', 4);
  const ENABLE_CONSOLE_LOGS = GM_getValue('ENABLE_CONSOLE_LOGS', true);

  const processedVideos = new Set(); // To keep track of processed video containers
  let scheduledFilter = null; // throttle flag for mutation observer

  /* ---------------- Settings UI ---------------- */
  function openSettingsMenu() {
    const settingsContainer = document.createElement('div');
    settingsContainer.id = 'yt-filters-settings';
    settingsContainer.style.position = 'fixed';
    settingsContainer.style.top = '50%';
    settingsContainer.style.left = '50%';
    settingsContainer.style.transform = 'translate(-50%, -50%)';
    settingsContainer.style.backgroundColor = '#282c34';
    settingsContainer.style.color = '#abb2bf';
    settingsContainer.style.padding = '20px';
    settingsContainer.style.borderRadius = '10px';
    settingsContainer.style.zIndex = '10000';
    settingsContainer.style.boxShadow = '0 0 20px rgba(0, 0, 0, 0.5)';
    settingsContainer.style.maxWidth = '500px';
    settingsContainer.style.maxHeight = '500px';
    settingsContainer.style.overflowY = 'auto';
    settingsContainer.style.fontFamily = 'Arial, sans-serif';

    settingsContainer.innerHTML = `
      <div>
        <h3 style="margin: 0 0 15px 0; font-size: 1.5em; color: #61dafb;">Video Filters Settings</h3>
        <label for="min-duration" style="display: block; margin-bottom: 5px;">Minimum Duration (seconds):</label>
        <input type="number" id="min-duration" value="${MIN_DURATION_SECONDS}" style="width: calc(100% - 22px); padding: 8px; border: 1px solid #444c56; border-radius: 5px; background: #3e4451; color: #abb2bf; margin-bottom: 15px;">
        <label for="age-threshold" style="display: block; margin-bottom: 5px;">Age Threshold (years):</label>
        <input type="number" id="age-threshold" value="${AGE_THRESHOLD_YEARS}" style="width: calc(100% - 22px); padding: 8px; border: 1px solid #444c56; border-radius: 5px; background: #3e4451; color: #abb2bf; margin-bottom: 15px;">
        <label for="enable-logs" style="display: block; margin-bottom: 5px;">Enable Console Logs:</label>
        <input type="checkbox" id="enable-logs" ${ENABLE_CONSOLE_LOGS ? 'checked' : ''} style="margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between;">
          <button id="save-settings" style="flex: 1; margin-right: 10px; padding: 10px; background-color: #61dafb; color: #282c34; border: none; border-radius: 5px; cursor: pointer;">Save</button>
          <button id="close-settings" style="flex: 1; padding: 10px; background-color: #e06c75; color: #282c34; border: none; border-radius: 5px; cursor: pointer;">Close</button>
        </div>
      </div>
    `;
    document.body.appendChild(settingsContainer);

    const saveButton = document.getElementById('save-settings');
    const closeButton = document.getElementById('close-settings');

    saveButton.addEventListener('click', () => {
      const newMinDuration = parseInt(document.getElementById('min-duration').value, 10);
      const newAgeThreshold = parseInt(document.getElementById('age-threshold').value, 10);
      const newEnableLogs = document.getElementById('enable-logs').checked;
      GM_setValue('MIN_DURATION_SECONDS', newMinDuration);
      GM_setValue('AGE_THRESHOLD_YEARS', newAgeThreshold);
      GM_setValue('ENABLE_CONSOLE_LOGS', newEnableLogs);
      alert('Settings saved!');
      settingsContainer.remove();
      window.location.reload();
    });

    closeButton.addEventListener('click', () => {
      settingsContainer.remove();
    });
  }

  GM_registerMenuCommand('Open YouTube Filters Settings', openSettingsMenu);

  /* ---------------- Utilities ---------------- */
  function convertDurationToSeconds(durationText) {
    // Handles HH:MM:SS, MM:SS, or single "SS" just in case.
    if (!durationText) return 0;
    // remove whitespace and any non-digit/: characters
    const sanitized = durationText.trim().replace(/[^\d:]/g, '');
    if (!sanitized) return 0;
    const parts = sanitized.split(':').map(p => parseInt(p, 10) || 0).reverse();
    let seconds = 0;
    for (let i = 0; i < parts.length; i++) {
      seconds += parts[i] * Math.pow(60, i);
    }
    return seconds;
  }

  function isShortVideo(durationInSeconds) {
    return durationInSeconds < MIN_DURATION_SECONDS && durationInSeconds !== 0;
  }

  // Extract "X years ago" style info from a container (works with new and old YouTube DOM)
  function getVideoAgeTextAndYears(container) {
    // Search any text nodes or spans near metadata rows that include "ago"
    const texts = Array.from(container.querySelectorAll('span, .yt-core-attributed-string, .yt-content-metadata-view-model-wiz__metadata-text'))
      .map(el => el.innerText && el.innerText.trim())
      .filter(Boolean);

    const ageText = texts.find(t => /\bago\b/i.test(t));
    if (ageText) {
      const yearsMatch = ageText.match(/(\d+)\s+(year|years)\s+ago/i);
      return {
        text: ageText,
        years: yearsMatch ? parseInt(yearsMatch[1], 10) : 0
      };
    }
    return { text: 'Unknown', years: 0 };
  }

  function getVideoTitle(container) {
    // new markup
    const newTitle = container.querySelector('.yt-lockup-metadata-view-model-wiz__title, .yt-lockup-metadata-view-model-wiz__heading-reset a');
    if (newTitle) {
      // the title text may be inside an inner span
      const inner = newTitle.querySelector('span') || newTitle;
      return inner.innerText ? inner.innerText.trim() : (newTitle.title || '');
    }
    // fallback to legacy selector
    const legacy = container.querySelector('#video-title');
    return legacy ? legacy.innerText.trim() : '';
  }

  function getDurationText(container) {
    // try new markup badge text
    let badge = container.querySelector('.badge-shape-wiz__text, yt-thumbnail-badge-view-model .badge-shape-wiz__text');
    if (badge && badge.innerText.trim()) return badge.innerText.trim();

    // legacy markup fallback
    const legacy = container.querySelector('span.ytd-thumbnail-overlay-time-status-renderer, .ytd-thumbnail-overlay-time-status-renderer');
    if (legacy && legacy.innerText) return legacy.innerText.trim();

    // sometimes duration is on the thumbnail overlay element
    const overlay = container.querySelector('[aria-label*="duration"], .yt-thumbnail-overlay-time-status-renderer');
    if (overlay && overlay.innerText) return overlay.innerText.trim();

    return '';
  }

  /* ---------------- Detection of channel / videos tab ---------------- */
  function isChannelVideosPage() {
    // matches /@name/videos or /channel/ /c/ /user/ followed by /videos
    const path = window.location.pathname || '';
    const channelVideosRegex = /^\/(?:(?:@[^\/]+)|(?:channel|c|user)\/[^\/]+)\/videos(\/.*)?$/i;
    return channelVideosRegex.test(path);
  }

  /* ---------------- Main filtering ---------------- */
  function collectVideoContainers() {
    const containers = new Set();

    // Preferred: anchors that link to watch pages — covers many renderers including new markup
    const watchAnchors = document.querySelectorAll('a[href*="/watch?v="]');
    watchAnchors.forEach(a => {
      // try to find a known container ancestor
      const container = a.closest('div.yt-lockup-view-model-wiz') ||
                        a.closest('ytd-rich-item-renderer') ||
                        a.closest('ytd-compact-video-renderer') ||
                        a.closest('ytd-video-renderer') ||
                        a.closest('ytd-playlist-panel-video-renderer') ||
                        a.closest('div.yt-lockup') ||
                        a.closest('div'); // last-resort (will be filtered)
      if (container) containers.add(container);
    });

    // Also include older renderer elements that might not have an anchor in the same way
    Array.from(document.querySelectorAll('ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-video-renderer, div.yt-lockup-view-model-wiz'))
      .forEach(el => containers.add(el));

    return Array.from(containers);
  }

  function filterVideos() {
    // Don't run on channel /videos pages
    if (isChannelVideosPage()) {
      if (ENABLE_CONSOLE_LOGS) console.log('[YT Filters] Skipping channel /videos page.');
      return;
    }

    const containers = collectVideoContainers();

    containers.forEach(container => {
      if (!container || processedVideos.has(container)) return;

      const title = getVideoTitle(container);
      const durationText = getDurationText(container) || '';
      const durationInSeconds = convertDurationToSeconds(durationText);
      const { text: videoAgeText, years: videoAgeInYears } = getVideoAgeTextAndYears(container);

      if (isShortVideo(durationInSeconds)) {
        if (ENABLE_CONSOLE_LOGS) {
          console.log(`%cDuration Removal: %c"${title}" %c(${durationText})`, "color: red;", "color: orange;", "color: deepskyblue;");
        }
        container.style.display = 'none';
        processedVideos.add(container);
      } else if (videoAgeInYears >= AGE_THRESHOLD_YEARS) {
        if (ENABLE_CONSOLE_LOGS) {
          console.log(`%cAge Removal: %c"${title}" %c(${videoAgeText})`, "color: red;", "color: orange;", "color: deepskyblue;");
        }
        container.style.display = 'none';
        processedVideos.add(container);
      } else {
        // If previously hidden by you but now ok, don't unhide automatically — keep it simple.
        processedVideos.add(container); // mark processed to avoid reprocessing
      }
    });
  }

  /* ---------------- Mutation observer (throttled) ---------------- */
  const observer = new MutationObserver((mutations) => {
    if (scheduledFilter) return;
    scheduledFilter = setTimeout(() => {
      try {
        filterVideos();
      } catch (e) {
        if (ENABLE_CONSOLE_LOGS) console.error('[YT Filters] Error during filter:', e);
      } finally {
        scheduledFilter = null;
      }
    }, 250); // small throttle
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Initial run after a short delay to allow content to render
  setTimeout(filterVideos, 600);

})();
