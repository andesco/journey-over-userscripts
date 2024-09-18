// ==UserScript==
// @name          YouTube - Resumer
// @version       1.2.0
// @description   Automatically saves and resumes YouTube videos from where you left off, even after closing the tab. Cleans up saved progress after 90 days to manage storage.
// @author        Journey Over
// @license       MIT
// @match         *://*.youtube.com/*
// @grant         GM.setValue
// @grant         GM.getValue
// @grant         GM.deleteValue
// @grant         GM.listValues
// @icon          https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/youtube-resumer.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/youtube-resumer.user.js
// ==/UserScript==

function l(...args) {
  console.log('[Resumer]', ...args);
}

function videoId(url = document.URL) {
  return new URL(url).searchParams.get('v');
}

function save(video, id) {
  if (video.currentTime >= 2) { // Ensure it only saves after 2 seconds
    GM.setValue(id, {
      "LastWatched": new Date().getTime(),
      "StoppedAt": parseInt(video.currentTime),
    });
    //l(`Saved video ${id} at ${video.currentTime} seconds`);
  }
}

async function cleanOldValues() {
  const ninetyDaysInMs = 90 * 24 * 60 * 60 * 1000;
  const currentTime = new Date().getTime();

  try {
    const videoIds = await GM.listValues(); // Get all stored video IDs
    for (const id of videoIds) {
      const savedVideo = await GM.getValue(id); // Fetch saved video progress

      if (savedVideo && savedVideo.LastWatched) {
        const lastWatched = savedVideo.LastWatched;

        // Check if the video progress was saved more than 90 days ago
        if (lastWatched < (currentTime - ninetyDaysInMs)) {
          await GM.deleteValue(id); // Delete old saved progress
          l(`Deleted old video progress for video ID: ${id}`);
        }
      }
    }
  } catch (error) {
    l('Error while cleaning old values:', error);
  }
}

function findVideo(onVideoFound) {
  const observer = new MutationObserver((mutations, observer) => {
    const video = document.querySelector('video.video-stream');
    if (video) {
      onVideoFound(video);
      observer.disconnect();
    }
  });
  observer.observe(document, { childList: true, subtree: true });
}

let id = videoId();

function listen(video) {
  let lastSrc;

  function handleTimeUpdate() {
    if (video.src && !isNaN(video.duration)) {
      if (id) {
        save(video, id);
        lastSrc = video.src;
      } else if (video.src === lastSrc) {
        save(video, lastId);
      }
    }
  }

  video.addEventListener('timeupdate', handleTimeUpdate);
  return () => {
    video.removeEventListener('timeupdate', handleTimeUpdate);
  };
}

async function resume(video) {
  id = videoId();
  const lastTime = await GM.getValue(id);
  if (lastTime && lastTime.StoppedAt) {
    l('Resuming video', id, 'from', lastTime.StoppedAt, 'seconds');
    video.currentTime = lastTime.StoppedAt;
  } else {
    l('No saved position, starting fresh');
  }
}

function cleanUrl() {
  const url = new URL(document.URL);
  url.searchParams.delete('t'); // Clean any timestamps in the URL to prevent conflicts
  window.history.replaceState(null, null, url);
}

let lastId;

document.addEventListener("yt-navigate-finish", () => {
  if (videoId() && lastId !== videoId()) {
    lastId = videoId();
    cleanUrl(); // Clean up the URL
    let removeListeners;
    findVideo(video => {
      resume(video);
      if (removeListeners) removeListeners();
      removeListeners = listen(video);
    });
  }
});

// Call the cleanOldValues function when the script is initialized
cleanOldValues();
