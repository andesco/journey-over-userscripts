// ==UserScript==
// @name          YouTube Filters
// @version       1.0
// @description   Filters YouTube videos by duration. Hides videos less than 2 minutes long, excluding channel video tabs.
// @author        JourneyOver
// @icon          https://i.imgur.com/1RYzIiT.png
// @match         *://*.youtube.com/*
// @grant         none
// @license       MIT
// @run-at        document-body
// ==/UserScript==

(function() {
  'use strict';

  // Function to check if a video duration is less than 2 minutes and not 0 seconds
  function isShortVideo(duration) {
      // Assuming duration is in seconds
      return duration < 120 && duration !== 0; // Change value here (the 120)
  }

  // Function to get the title of a video element
  function getVideoTitle(video) {
      var titleElement = video.querySelector('#video-title');
      return titleElement ? titleElement.innerText.trim() : null;
  }

  // Function to filter out short videos
  function filterVideos() {
        // Check if we are on a channel page by looking at URL or specific elements
        var url = window.location.href;
        var isChannelPage = url.includes('@') && url.includes('/videos');

        if (isChannelPage) {
            //console.log("Skipping filtering on channel page.");
            return; // Exit if we are on a channel's video tab
        }

      // Get all video elements on the page
      var videos = document.querySelectorAll('ytd-rich-item-renderer, ytd-compact-video-renderer, ytd-video-renderer, ytd-playlist-panel-video-renderer');

      videos.forEach(function(video) {
          // Get the title of each video
          var title = getVideoTitle(video);

          // Get the duration of each video
          var durationElement = video.querySelector('span.ytd-thumbnail-overlay-time-status-renderer');
          var durationText = durationElement ? durationElement.innerText.trim() : '';

          if (title && durationText) {
              // Extract duration in seconds from the element text
              var durationArray = durationText.split(':');
              var durationInSeconds = 0;
              // Convert duration to seconds
              if (durationArray.length === 3) {
                  durationInSeconds += parseInt(durationArray[0]) * 3600;
                  durationInSeconds += parseInt(durationArray[1]) * 60;
                  durationInSeconds += parseInt(durationArray[2]);
              } else if (durationArray.length === 2) {
                  durationInSeconds += parseInt(durationArray[0]) * 60;
                  durationInSeconds += parseInt(durationArray[1]);
              } else {
                  durationInSeconds += parseInt(durationArray[0]);
              }
              // Check if the video is short and not 0 seconds
              if (isShortVideo(durationInSeconds)) {
                  // Log the title and duration of the removed video with custom colors
                  console.log("%cDuration Removal: %c" + title + " %c(" + durationText + ")", "color: red;", "color: orange;", "color: deepskyblue;");
                  // Remove the parent element of the video
                  video.parentNode.removeChild(video);
              }
          }
      });
  }

  // Run the filter when the page loads and when new content is added (AJAX)
  var observer = new MutationObserver(filterVideos);
  observer.observe(document.body, { childList: true, subtree: true });
  filterVideos();
})();
