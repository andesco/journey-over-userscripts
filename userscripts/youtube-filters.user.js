// ==UserScript==
// @name          YouTube Filters
// @version       1.2
// @description   Filters YouTube videos by duration and age. Hides videos less than 2 minutes long or older than a specified number of years, excluding channel video tabs.
// @author        JourneyOver
// @icon          https://i.imgur.com/1RYzIiT.png
// @match         *://*.youtube.com/*
// @grant         none
// @license       MIT
// @run-at        document-body
// ==/UserScript==

(function() {
  'use strict';

  const MIN_DURATION_SECONDS = 120; // Minimum duration of videos in seconds
  const AGE_THRESHOLD_YEARS = 4; // Maximum age of videos in years

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
      const title = getVideoTitle(video);
      const durationElement = video.querySelector('span.ytd-thumbnail-overlay-time-status-renderer');
      const durationText = durationElement ? durationElement.innerText.trim() : '';
      const durationInSeconds = convertDurationToSeconds(durationText);
      const { text: videoAgeText, years: videoAgeInYears } = getVideoAgeTextAndYears(video);

      if (isShortVideo(durationInSeconds)) {
        console.log(`%cDuration Removal: %c"${title}" %c(${durationText})`, "color: red;", "color: orange;", "color: deepskyblue;");
        video.parentNode.removeChild(video);
      } else if (videoAgeInYears >= AGE_THRESHOLD_YEARS) {
        console.log(`%cAge Removal: %c"${title}" %c(${videoAgeText})`, "color: red;", "color: orange;", "color: deepskyblue;");
        video.parentNode.removeChild(video);
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
