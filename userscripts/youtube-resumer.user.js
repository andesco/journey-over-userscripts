// ==UserScript==
// @name          YouTube Resumer
// @version       1.1.0
// @description   Store video.currentTime locally
// @author        Journey Over
// @license       MIT
// @match         *://*.youtube.com/*
// @grant         GM_setValue
// @grant         GM_getValue
// @grant         GM_addStyle
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

let lastTimeInSeconds;

function save(video, id) {
  const seconds = Math.floor(video.currentTime);
  if (lastTimeInSeconds !== seconds) {
      const completion = video.currentTime / video.duration;
      GM.setValue(id, video.currentTime);
      GM.setValue(id + '-completion', completion);
      lastTimeInSeconds = seconds;
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
  if (lastTime) {
      l('resuming', id, video.currentTime, lastTime);
      video.currentTime = lastTime;
  } else {
      l('new', video.currentTime);
  }
}

function cleanUrl() {
  const url = new URL(document.URL);
  url.searchParams.delete('t');
  window.history.replaceState(null, null, url);
}

let lastId;

document.addEventListener("yt-navigate-finish", () => {
  if (videoId() && lastId !== videoId()) {
      lastId = videoId();
      cleanUrl();
      let removeListeners;
      findVideo(video => {
          resume(video);
          if (removeListeners) removeListeners();
          removeListeners = listen(video);
      });
  }
});

function addProgressBar(thumbnail, completion) {
  let overlays = thumbnail.querySelector('#overlays');
  let existingProgressBar = thumbnail.querySelector('ytd-thumbnail-overlay-resume-playback-renderer');
  if (!existingProgressBar) {
      let parent = document.createElement('div');
      parent.innerHTML = `
          <ytd-thumbnail-overlay-resume-playback-renderer class="style-scope ytd-thumbnail">
               <div id="progress" class="style-scope ytd-thumbnail-overlay-resume-playback-renderer" style="width: 100%"></div>
          </ytd-thumbnail-overlay-resume-playback-renderer>
      `;
      overlays.appendChild(parent.children[0]);
  }

  let progress = overlays.querySelector('#progress');
  let width = parseInt(completion * 100);
  progress.style.width = `${width}%`;
  progress.style.backgroundColor = 'blue';
}

function progressBars() {
  const observer = new MutationObserver(async (mutations, observer) => {
      for (let mutation of mutations) {
          if (mutation.addedNodes.length > 0) {
              let thumbnails = mutation.target.querySelectorAll('a.ytd-thumbnail');
              for (let thumbnail of thumbnails) {
                  let href = thumbnail.href;
                  if (href) {
                      let id = videoId(href);
                      let completion = await GM.getValue(id + '-completion');
                      if (completion) {
                          addProgressBar(thumbnail, completion);
                      }
                  }
              }
          }
      }
  });
  observer.observe(document, { childList: true, subtree: true });
}

progressBars();
