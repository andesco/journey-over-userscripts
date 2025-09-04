// ==UserScript==
// @name          YouTube - Tweaks
// @version       1.0.0
// @description   Random tweaks and fixes for YouTube!
// @author        Journey Over
// @license       MIT
// @match         *://*.youtube.com/*
// @match         *://*.youtube-nocookie.com/*
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@c185c2777d00a6826a8bf3c43bbcdcfeba5a9566/libs/gm/gmcompat.min.js
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@c185c2777d00a6826a8bf3c43bbcdcfeba5a9566/libs/utils/utils.min.js
// @grant         GM.getValue
// @grant         GM.setValue
// @grant         GM.registerMenuCommand
// @icon          https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/youtube-tweaks.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/youtube-tweaks.user.js
// ==/UserScript==

(async function() {
  'use strict';

  const logger = Logger('YT - Tweaks', { debug: false });

  // Feature registry
  const features = {
    removeBigMode: {
      id: 'removeBigMode',
      name: 'Remove YouTube Big Mode update',
      default: true,
      enabled: false,
      observer: null,
      deleteBigMode() {
        const els = document.querySelectorAll('.ytp-big-mode');
        els.forEach(el => el.classList.remove('ytp-big-mode'));
      },
      start() {
        if (this.observer) return;
        this.deleteBigMode();
        this.observer = new MutationObserver(() => this.deleteBigMode());
        this.observer.observe(document.body, { childList: true, subtree: true, attributes: true });
      },
      stop() {
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
        }
      }
    },

    playlistPlaySingle: {
      id: 'playlistPlaySingle',
      name: 'Playlist: Play Single Button',
      default: true,
      enabled: false,
      handlers: {},
      createButtons() {
        if (location.href.indexOf('/playlist?') <= 0) return;
        const videoEntries = document.querySelectorAll('ytd-playlist-video-renderer');
        videoEntries.forEach(videoEntry => {
          const thumb = videoEntry.querySelector('a#thumbnail');
          if (!thumb) return;
          const href = thumb.getAttribute('href') || '';
          const videoEntryURLSplit = href.split('&list=');
          if (videoEntryURLSplit.length <= 1) return;
          const videoWatchURL = videoEntryURLSplit[0];

          let button = videoEntry.querySelector('button-view-model#button-play-single');
          if (button) { const a = button.querySelector('a'); if (a) a.setAttribute('href', videoWatchURL); return; }

          button = document.createElement('button-view-model');
          button.className = 'yt-spec-button-view-model';
          button.id = 'button-play-single';
          const anchor = document.createElement('a');
          anchor.className = 'yt-spec-button-shape-next yt-spec-button-shape-next--filled yt-spec-button-shape-next--overlay yt-spec-button-shape-next--size-m yt-spec-button-shape-next--icon-leading yt-spec-button-shape-next--enable-backdrop-filter-experiment';
          anchor.setAttribute('href', videoWatchURL);
          anchor.setAttribute('aria-label', 'Play Single');
          anchor.style.paddingRight = '0';
          const iconWrapper = document.createElement('div');
          iconWrapper.className = 'yt-spec-button-shape-next__icon';
          iconWrapper.setAttribute('aria-hidden', 'true');
          const icon = document.createElement('img');
          icon.setAttribute('src', 'https://static.thenounproject.com/png/open-link-icon-1395731-512.png');
          icon.style.width = '24px';
          icon.style.height = '24px';
          iconWrapper.appendChild(icon);
          anchor.appendChild(iconWrapper);
          button.appendChild(anchor);
          const menu = videoEntry.querySelector('div#menu');
          if (menu) videoEntry.insertBefore(button, menu);
        });
      },
      start() {
        if (this.handlers._started) return;
        this.createButtons();
        this.handlers.nav = () => this.createButtons();
        this.handlers.action = (ev) => { const d = ev && ev.detail; if (d && d.actionName && (d.actionName.indexOf('yt-append-continuation') >= 0 || d.actionName === 'yt-update-playlist-action')) this.createButtons(); };
        document.addEventListener('yt-navigate-finish', this.handlers.nav);
        document.addEventListener('yt-action', this.handlers.action);
        this.handlers._started = true;
      },
      stop() {
        if (!this.handlers._started) return;
        document.removeEventListener('yt-navigate-finish', this.handlers.nav);
        document.removeEventListener('yt-action', this.handlers.action);
        // remove inserted buttons
        document.querySelectorAll('button-view-model#button-play-single').forEach(b => b.remove());
        this.handlers = {};
      }
    },

    monoAudioFix: {
      id: 'monoAudioFix',
      name: 'YouTube Mono/One-Ear Audio Fix',
      default: true,
      enabled: false,
      ctx: null,
      fixed: new WeakSet(),
      observer: null,
      rms(buf) { return Math.sqrt(buf.reduce((s, v) => s + ((v - 128) / 128) ** 2, 0) / buf.length); },
      setup(video) {
        if (!video || this.fixed.has(video)) return;
        this.ctx ||= new(window.AudioContext || window.webkitAudioContext)();
        if (this.ctx.state === 'suspended') try { this.ctx.resume(); } catch (err) {}
        try {
          const src = this.ctx.createMediaElementSource(video);
          const split = this.ctx.createChannelSplitter(2);
          const merge = this.ctx.createChannelMerger(2);
          const gain = this.ctx.createGain();
          const aL = this.ctx.createAnalyser(),
            aR = this.ctx.createAnalyser();
                    [aL, aR].forEach(a => a.fftSize = 32);
          gain.gain.value = 1;
          src.connect(split);
          merge.connect(this.ctx.destination);
          split.connect(aL, 0);
          split.connect(aR, 1);
          this.fixed.add(video);

          const check = () => {
            const bL = new Uint8Array(aL.fftSize),
              bR = new Uint8Array(aR.fftSize);
            aL.getByteTimeDomainData(bL);
            aR.getByteTimeDomainData(bR);
            const silentL = this.rms(bL) < 0.02,
              silentR = this.rms(bR) < 0.02;
            try { split.disconnect(); } catch (err) {}
            try { gain.disconnect(); } catch (err) {}
            if (silentL || silentR) {
              split.connect(gain, 0);
              split.connect(gain, 1);
              gain.connect(merge, 0, 0);
              gain.connect(merge, 0, 1);
            } else {
              split.connect(merge, 0, 0);
              split.connect(merge, 1, 1);
            }
            if (!video.paused && !video.ended) setTimeout(check, 1500);
          };
          check();
        } catch (err) {
          // some browsers restrict createMediaElementSource if page not allowed
          // swallow error
        }
      },
      start() {
        if (this.observer) return;
        this.observer = new MutationObserver(() => document.querySelectorAll('video').forEach(v => this.setup(v)));
        this.observer.observe(document.body, { childList: true, subtree: true });
        document.querySelectorAll('video').forEach(v => this.setup(v));
      },
      stop() {
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
        }
      }
    },

    dimWatched: {
      id: 'dimWatched',
      name: 'Dim Watched Videos',
      default: true,
      enabled: false,
      CLASS: 'yt-dimmed',
      DIM_OPACITY: 0.1,
      DIM_OPACITY_HOVER: 1,
      pending: false,
      observer: null,
      initStyle() {
        if (document.getElementById('gm-dimwatched-style')) return;
        const style = document.createElement('style');
        style.id = 'gm-dimwatched-style';
        style.textContent = `
                    ytd-rich-grid-media,
                    ytd-rich-item-renderer,
                    ytd-grid-video-renderer,
                    ytd-playlist-video-renderer,
                    ytd-video-renderer,
                    yt-lockup-view-model {
                        transition: opacity 0.3s ease;
                    }
                    .${this.CLASS} { opacity: ${this.DIM_OPACITY} !important; }
                    .${this.CLASS}:hover { opacity: ${this.DIM_OPACITY_HOVER} !important; }
                `;
        document.head.appendChild(style);
      },
      isWatched(el) {
        return el.querySelector('ytd-thumbnail-overlay-resume-playback-renderer #progress') || el.querySelector('.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment');
      },
      update() {
        const seen = new WeakSet();
        const selectors = { grid: ['ytd-rich-item-renderer'], channel: ['ytd-grid-video-renderer'], playlist: ['ytd-playlist-video-renderer'], sidebar: ['yt-lockup-view-model'], search: ['ytd-video-renderer'] };
        for (const [section, selList] of Object.entries(selectors)) {
          selList.forEach(selector => {
            document.querySelectorAll(selector).forEach(el => {
              if (seen.has(el)) return;

              // Avoid double-dimming:
              if (section === 'grid' && el.tagName === 'YTD-RICH-GRID-MEDIA' && el.closest('ytd-rich-item-renderer')?.classList.contains(this.CLASS)) {
                return;
              }

              if (section === 'sidebar' && el.tagName === 'YT-LOCKUP-VIEW-MODEL' && el.closest('ytd-rich-item-renderer')?.classList.contains(this.CLASS)) {
                return;
              }

              seen.add(el);
              const watched = this.isWatched(el);
              el.classList.toggle(this.CLASS, !!watched);
            });
          });
        }
      },
      debouncedUpdate() {
        if (this.pending) return;
        this.pending = true;
        requestAnimationFrame(() => {
          this.update();
          this.pending = false;
        });
      },
      start() {
        this.initStyle();
        if (this.observer) return;
        this.observer = new MutationObserver(() => this.debouncedUpdate());
        this.observer.observe(document.body, { childList: true, subtree: true });
        this.update();
      },
      stop() {
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
        }
        document.querySelectorAll('.' + this.CLASS).forEach(el => el.classList.remove(this.CLASS));
      }
    }
  };

  // Load persisted enabled state for each feature
  for (const key of Object.keys(features)) {
    const f = features[key];
    f.enabled = await GMC.getValue(`feature_${f.id}`, f.default);
    if (f.enabled) { try { f.start(); } catch (err) { logger.error('Error starting', f.id, err); } }
  }

  // Settings UI
  let modal = null;

  function createModal() {
    if (modal) return modal;
    const wrap = document.createElement('div');
    wrap.id = 'combined-userscript-settings';
    Object.assign(wrap.style, { position: 'fixed', zIndex: 999999, left: '50%', top: '50%', transform: 'translate(-50%,-50%)', background: '#111', color: '#fff', padding: '14px', borderRadius: '8px', minWidth: '320px', boxShadow: '0 6px 30px rgba(0,0,0,0.6)' });
    const title = document.createElement('div');
    title.textContent = 'YouTube - Tweaks Settings';
    title.style.fontWeight = '600';
    title.style.marginBottom = '8px';
    wrap.appendChild(title);
    const list = document.createElement('div');
    for (const key of Object.keys(features)) {
      const f = features[key];
      const row = document.createElement('label');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '8px';
      row.style.margin = '6px 0';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = !!f.enabled;
      cb.dataset.feature = f.id;
      // Apply change immediately when checkbox toggled
      cb.addEventListener('change', async () => {
        const want = !!cb.checked;
        if (want === f.enabled) return;
        f.enabled = want;
        try { await GMC.setValue(`feature_${f.id}`, f.enabled); } catch (err) { logger.error('Failed to save feature state', f.id, err); }
        try {
          if (f.enabled) f.start();
          else f.stop();
        } catch (err) { logger.error('Error toggling feature', f.id, err); }
      });
      const span = document.createElement('span');
      span.textContent = f.name;
      row.appendChild(cb);
      row.appendChild(span);
      list.appendChild(row);
    }
    wrap.appendChild(list);
    const buttons = document.createElement('div');
    buttons.style.display = 'flex';
    buttons.style.justifyContent = 'flex-end';
    buttons.style.marginTop = '10px';
    const save = document.createElement('button');
    save.textContent = 'Save';
    save.style.marginRight = '8px';
    const close = document.createElement('button');
    close.textContent = 'Close';
    save.addEventListener('click', async () => {
      wrap.querySelectorAll('input[type="checkbox"]').forEach(async (input) => {
        const id = input.dataset.feature;
        const f = Object.values(features).find(x => x.id === id);
        if (!f) return;
        const want = !!input.checked;
        if (want === f.enabled) return;
        f.enabled = want;
        await GMC.setValue(`feature_${f.id}`, f.enabled);
        try {
          if (f.enabled) f.start();
          else f.stop();
        } catch (err) { logger.error('Error toggling feature', f.id, err); }
      });
      // close after save
      removeModal();
    });
    close.addEventListener('click', removeModal);
    buttons.appendChild(save);
    buttons.appendChild(close);
    wrap.appendChild(buttons);
    modal = wrap;
    return modal;
  }

  function removeModal() {
    if (!modal) return;
    modal.remove();
    modal = null;
  }

  // Register GM menu command to open settings
  try {
    GMC.registerMenuCommand('Open YouTube Tweaks Settings', () => { const m = createModal(); if (!document.body.contains(m)) document.body.appendChild(m); });
  } catch (err) { logger.error('Failed to register menu command', err); }

})();
