// ==UserScript==
// @name          YouTube Filters
// @version       1.4.0
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

  const processedVideos = new Set(); // To keep track of processed videos

  // Create a settings menu
  function openSettingsMenu() {
    const settingsContainer = document.createElement('div');
    settingsContainer.id = 'yt-filters-settings';
    settingsContainer.style.position = 'fixed';
    settingsContainer.style.top = '50%';
    settingsContainer.style.left = '50%';
    settingsContainer.style.transform = 'translate(-50%, -50%)';
    settingsContainer.style.backgroundColor = '#333';
    settingsContainer.style.color = '#fff';
    settingsContainer.style.padding = '20px';
    settingsContainer.style.borderRadius = '8px';
    settingsContainer.style.zIndex = '10000';
    settingsContainer.style.boxShadow = '0 0 15px rgba(0, 0, 0, 0.6)';
    settingsContainer.style.maxWidth = '400px';
    settingsContainer.style.maxHeight = '500px';
    settingsContainer.style.overflowY = 'auto';

    settingsContainer.innerHTML = `
      <div>
        <h3 style="margin: 0;">Video Filters Settings</h3>
        <label for="min-duration">Minimum Duration (seconds):</label>
        <input type="number" id="min-duration" value="${MIN_DURATION_SECONDS}" style="width: 100%; margin-bottom: 10px;">
        <label for="age-threshold">Age Threshold (years):</label>
        <input type="number" id="age-threshold" value="${AGE_THRESHOLD_YEARS}" style="width: 100%; margin-bottom: 10px;">
        <button id="save-settings" style="width: 100%; padding: 8px; background-color: #007bff; color: #fff; border: none; border-radius: 4px; cursor: pointer; margin-bottom: 5px;">Save</button>
        <button id="close-settings" style="width: 100%; padding: 8px; background-color: #dc3545; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
    `;
    document.body.appendChild(settingsContainer);

    const saveButton = document.getElementById('save-settings');
    const closeButton = document.getElementById('close-settings');

    saveButton.addEventListener('click', () => {
      const newMinDuration = parseInt(document.getElementById('min-duration').value, 10);
      const newAgeThreshold = parseInt(document.getElementById('age-threshold').value, 10);
      GM_setValue('MIN_DURATION_SECONDS', newMinDuration);
      GM_setValue('AGE_THRESHOLD_YEARS', newAgeThreshold);
      alert('Settings saved!');
      settingsContainer.remove();
    });

    closeButton.addEventListener('click', () => {
      settingsContainer.remove();
    });
  }

  // Register a menu command for opening the settings menu
  GM_registerMenuCommand('Open YouTube Filters Settings', openSettingsMenu);

  // Function to convert video duration from HH:MM:SS or MM:SS to seconds
  function convertDurationToSeconds(durationText) {
    const timeParts = durationText.split(':').reverse();
    let seconds = 0;

    timeParts.forEach((part, index) => {
      seconds += parseInt(part, 10) * Math.pow(60, index);
    });

    return seconds;
  }

  // Function to determine if a video is short (less than MIN_DURATION_SECONDS) or not
  function isShortVideo(durationInSeconds) {
    return durationInSeconds < MIN_DURATION_SECONDS && durationInSeconds !== 0;
  }

  // Function to extract video age text and convert it to years
  function getVideoAgeTextAndYears(video) {
    const ageText = Array.from(video.querySelectorAll('span.inline-metadata-item.style-scope.ytd-video-meta-block'))
      .map(el => el.innerText.trim())
      .find(text => text.toLowerCase().includes("ago"));

    if (ageText) {
      const yearsMatch = ageText.match(/(\d+)\s+(year|years)\s+ago/i);
      return {
        text: ageText,
        years: yearsMatch ? parseInt(yearsMatch[1], 10) : 0
      };
    }
    return { text: 'Unknown', years: 0 };
  }

  // Function to process and filter videos based on duration and age
  function filterVideos() {
    // Check if we are on a channel page by looking at URL or specific elements
    const url = window.location.href;
    const isChannelPage = url.includes('@') && url.includes('/videos');

    if (isChannelPage) {
      //console.log("Skipping filtering on channel page.");
      return; // Exit if we are on a channel's video tab
    }

    const videoSelectors = 'ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-video-renderer, ytd-playlist-panel-video-renderer';
    const videos = document.querySelectorAll(videoSelectors);

    videos.forEach(video => {
      if (processedVideos.has(video)) return; // Skip if already processed

      const title = getVideoTitle(video);
      const durationElement = video.querySelector('span.ytd-thumbnail-overlay-time-status-renderer');
      const durationText = durationElement ? durationElement.innerText.trim() : '';
      const durationInSeconds = convertDurationToSeconds(durationText);
      const { text: videoAgeText, years: videoAgeInYears } = getVideoAgeTextAndYears(video);

      if (isShortVideo(durationInSeconds)) {
        console.log(`%cDuration Removal: %c"${title}" %c(${durationText})`, "color: red;", "color: orange;", "color: deepskyblue;");
        video.style.display = 'none'; // Hide short videos
        processedVideos.add(video); // Mark as processed
      } else if (videoAgeInYears >= AGE_THRESHOLD_YEARS) {
        console.log(`%cAge Removal: %c"${title}" %c(${videoAgeText})`, "color: red;", "color: orange;", "color: deepskyblue;");
        video.style.display = 'none'; // Hide old videos
        processedVideos.add(video); // Mark as processed
      }
    });
  }

  // Function to get the video title
  function getVideoTitle(video) {
    const titleElement = video.querySelector('#video-title');
    return titleElement ? titleElement.innerText.trim() : '';
  }

  // Create a MutationObserver to detect and handle new videos added dynamically
  const observer = new MutationObserver(filterVideos);
  observer.observe(document.body, { childList: true, subtree: true });

  // Initial filter run
  filterVideos();
})();
