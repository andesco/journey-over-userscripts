// ==UserScript==
// @name          YouTube - Resumer
// @version       1.2.2
// @description   Automatically saves and resumes YouTube videos from where you left off, even after closing the tab. Cleans up saved progress after 90 days to manage storage.
// @author        Journey Over
// @license       MIT
// @match         *://*.youtube.com/*
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@5f2cbff53b0158ca07c86917994df0ed349eb96c/libs/gm/gmcompat.js
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@3f583300710ef7fa14d141febac3c8a2055fa5f8/libs/utils/utils.js
// @grant         GM.setValue
// @grant         GM.getValue
// @grant         GM.deleteValue
// @grant         GM.listValues
// @icon          https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/youtube-resumer.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/youtube-resumer.user.js
// ==/UserScript==

(function() {
  'use strict';

  const logger = Logger('YT - Resumer', { debug: false });

  // Get video ID from URL
  function videoId(url = document.URL) {
    const urlObj = new URL(url);
    if (urlObj.pathname === '/watch') { // Handle regular YouTube watch URLs (youtube.com/watch?v=ID)
      return urlObj.searchParams.get('v');
    } else if (urlObj.pathname.startsWith('/embed/')) { // Handle embed URLs (youtube.com/embed/ID)
      return urlObj.pathname.split('/')[2];
    } else if (urlObj.hostname === 'youtu.be') { // Handle youtu.be shortened URLs (youtu.be/ID)
      return urlObj.pathname.slice(1);
    }
    return null;
  }

  // Save current progress
  function save(video, id) {
    if (!id) return;
    if (video.currentTime >= 2) {
      GMC.setValue(id, {
        LastWatched: Date.now(),
        StoppedAt: parseInt(video.currentTime),
      });
      logger.debug(`Saved video ${id} at ${video.currentTime} seconds`);
    }
  }

  // Clean saved progress older than 90 days
  async function cleanOldValues() {
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    try {
      const ids = await GMC.listValues();
      for (const id of ids) {
        const saved = await GMC.getValue(id);
        if (saved?.LastWatched && saved.LastWatched < now - ninetyDaysMs) {
          await GMC.deleteValue(id);
          logger.debug(`Deleted old progress for video ID: ${id}`);
        }
      }
    } catch (err) {
      logger.error('Error cleaning old values:', err);
    }
  }

  // Find video element when it becomes available
  function findVideo(onVideoFound) {
    const observer = new MutationObserver(() => {
      const video = document.querySelector('video.video-stream');
      if (video) {
        onVideoFound(video);
        observer.disconnect();
      }
    });
    observer.observe(document, { childList: true, subtree: true });
  }

  // Listen for timeupdate events and save progress
  function listen(video) {
    let lastSrc;

    function handleTimeUpdate() {
      if (!video || isNaN(video.duration)) return;
      if (id) {
        save(video, id);
        lastSrc = video.src;
      } else if (video.src === lastSrc) {
        save(video, lastId);
      }
    }
    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }

  // Resume video from last saved position
  async function resume(video) {
    id = videoId();
    if (!id) return;
    const saved = await GMC.getValue(id);
    if (saved?.StoppedAt) {
      logger.debug('Resuming video', id, 'from', saved.StoppedAt, 'seconds');
      video.currentTime = saved.StoppedAt;
    } else {
      logger.debug('No saved position, starting fresh');
    }
  }

  // Remove timestamp from URL
  function cleanUrl() {
    const url = new URL(document.URL);
    url.searchParams.delete('t');
    window.history.replaceState(null, null, url);
  }

  // Handle navigation events and embedded video updates
  let id;
  let lastId;

  function handleNavigation() {
    const currentId = videoId();
    if (currentId && lastId !== currentId) {
      lastId = currentId;
      cleanUrl();
      let removeListeners;
      findVideo(video => {
        resume(video);
        if (removeListeners) removeListeners();
        removeListeners = listen(video);
      });
    }
  }

  // Listen for regular YouTube navigation
  document.addEventListener('yt-navigate-finish', handleNavigation);

  // Embedded videos may not trigger navigation events
  if (window.location.pathname.startsWith('/embed/')) {
    handleNavigation();
    setInterval(handleNavigation, 1000);
  }

  // Initialize cleanup
  cleanOldValues();

})();
