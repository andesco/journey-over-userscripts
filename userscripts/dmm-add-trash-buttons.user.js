// ==UserScript==
// @name          DMM - Add Trash Guide Regex Buttons
// @version       2.0.0
// @description   Adds buttons to Debrid Media Manager for applying Trash Guide regex patterns.
// @author        Journey Over
// @license       MIT
// @match         *://debridmediamanager.com/*
// @require       https://cdn.staticdelivr.com/gh/StylusThemes/Userscripts/refs/heads/main/libs/dmm/button-data.min.js?version=1.0.0
// @grant         none
// @icon          https://www.google.com/s2/favicons?sz=64&domain=debridmediamanager.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/dmm-add-trash-buttons.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/dmm-add-trash-buttons.user.js
// ==/UserScript==

(function () {
  'use strict';

  /* ===========================
     Config
     =========================== */
  const CONFIG = {
    CONTAINER_SELECTOR: '.mb-2',
    RELEVANT_PAGE_RX: /debridmediamanager\.com\/(movie|show)\/[^\/]+/,
    DEBOUNCE_MS: 120,
    MAX_RETRIES: 20,
    CSS_CLASS_PREFIX: 'dmm-tg',
  };

  // external data expected to be an array on window.DMM_BUTTON_DATA
  const BUTTON_DATA = Array.isArray(window?.DMM_BUTTON_DATA) ? window.DMM_BUTTON_DATA : [];

  /* ===========================
     Small helpers
     =========================== */
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const isVisible = el => !!(el && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden');

  const getNativeValueSetter = (el) => {
    const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    return desc && desc.set;
  };

  const setInputValueReactive = (el, value) => {
    const nativeSetter = getNativeValueSetter(el);
    if (nativeSetter) {
      nativeSetter.call(el, value);
    } else {
      el.value = value;
    }
    // focus + move cursor to end
    try { el.focus(); } catch (e) {}
    try { if (typeof el.setSelectionRange === 'function') el.setSelectionRange(value.length, value.length); } catch (e) {}

    // events
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    // React internals fallback
    try {
      if (el._valueTracker && typeof el._valueTracker.setValue === 'function') {
        el._valueTracker.setValue(value);
      }
    } catch (e) {}
  };

  // debounce helper
  const debounce = (fn, ms) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  /* ===========================
     Inject CSS
     =========================== */
  (function injectStyles() {
    const p = CONFIG.CSS_CLASS_PREFIX;
    const css = `
      .${p}-btn { cursor:pointer; display:inline-block; margin-right:.5rem; padding:.18rem .5rem; font-size:12px; line-height:1; border-radius:.375rem; color:#fff; background:#ff6b6b; border:1px solid #ff4c4c; box-shadow:0 2px 6px rgba(0,0,0,.15); user-select:none; }
      .${p}-btn:focus { outline:2px solid rgba(255,107,107,.35); outline-offset:2px; }
      .${p}-menu { position:fixed; min-width:12rem; background:#1f2937; color:#fff; border-radius:.5rem; box-shadow:0 8px 24px rgba(0,0,0,.45); padding:.25rem 0; z-index:9999; display:none; }
      .${p}-item { padding:.45rem .9rem; cursor:pointer; font-size:13px; white-space:nowrap; }
      .${p}-item:hover { background:#374151; }
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  })();

  /* ===========================
     ButtonManager - manages dropdowns and interactions
     =========================== */
  class ButtonManager {
    constructor() {
      /** Map<string, {button:HTMLElement, menu:HTMLElement}> */
      this.dropdowns = new Map();
      this.container = null;
      this.openMenu = null;
      this.documentClickHandler = this.onDocumentClick.bind(this);
      this.resizeHandler = this.onWindowResize.bind(this);
    }

    cleanup() {
      // remove elements & listeners
      for (const { button, menu } of this.dropdowns.values()) {
        button.remove();
        menu.remove();
      }
      this.dropdowns.clear();
      this.container = null;
      this.openMenu = null;
      document.removeEventListener('click', this.documentClickHandler, true);
      window.removeEventListener('resize', this.resizeHandler);
    }

    initialize(container) {
      if (!container || this.container === container) return;
      this.cleanup();
      this.container = container;

      BUTTON_DATA.forEach(spec => {
        const name = String(spec.name || 'Pattern');
        if (this.dropdowns.has(name)) return;
        const btn = this._createButton(name);
        const menu = this._createMenu(spec.buttonData || [], name);
        document.body.appendChild(menu);
        this.container.appendChild(btn);
        this.dropdowns.set(name, { button: btn, menu });
        // attach button click
        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.toggleMenu(name);
        });
      });

      // global handlers for closing
      document.addEventListener('click', this.documentClickHandler, true);
      window.addEventListener('resize', this.resizeHandler);
    }

    _createButton(name) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `${CONFIG.CSS_CLASS_PREFIX}-btn`;
      btn.textContent = name;
      btn.setAttribute('aria-haspopup', 'true');
      btn.setAttribute('aria-expanded', 'false');
      btn.tabIndex = 0;
      return btn;
    }

    _createMenu(items = [], name) {
      const menu = document.createElement('div');
      menu.className = `${CONFIG.CSS_CLASS_PREFIX}-menu`;
      menu.dataset.owner = name;
      items.forEach(it => {
        const item = document.createElement('div');
        item.className = `${CONFIG.CSS_CLASS_PREFIX}-item`;
        item.textContent = it.name || it.value || 'apply';
        item.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.onSelectPattern(it.value, it.name);
          this.closeOpenMenu();
        });
        menu.appendChild(item);
      });
      return menu;
    }

    toggleMenu(name) {
      const entry = this.dropdowns.get(name);
      if (!entry) return;
      const { button, menu } = entry;
      if (this.openMenu && this.openMenu !== menu) this.openMenu.style.display = 'none';
      if (menu.style.display === 'block') {
        menu.style.display = 'none';
        button.setAttribute('aria-expanded', 'false');
        this.openMenu = null;
      } else {
        this.positionMenuUnderButton(menu, button);
        menu.style.display = 'block';
        button.setAttribute('aria-expanded', 'true');
        this.openMenu = menu;
      }
    }

    positionMenuUnderButton(menu, button) {
      const rect = button.getBoundingClientRect();
      // Keep menu within viewport horizontally if possible
      const left = Math.max(8, rect.left);
      const top = window.scrollY + rect.bottom + 6;
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    }

    onDocumentClick(e) {
      if (!this.openMenu) return;
      const target = e.target;
      // if clicked inside openMenu or the corresponding button, ignore
      const matchingButton = Array.from(this.dropdowns.values()).find(v => v.menu === this.openMenu)?.button;
      if (matchingButton && (matchingButton.contains(target) || this.openMenu.contains(target))) return;
      this.closeOpenMenu();
    }

    onWindowResize() {
      if (!this.openMenu) return;
      // reposition if open
      const owner = this.openMenu.dataset.owner;
      const entry = this.dropdowns.get(owner);
      if (entry) this.positionMenuUnderButton(entry.menu, entry.button);
    }

    closeOpenMenu() {
      if (!this.openMenu) return;
      const owner = this.openMenu.dataset.owner;
      const entry = this.dropdowns.get(owner);
      if (entry) entry.button.setAttribute('aria-expanded', 'false');
      this.openMenu.style.display = 'none';
      this.openMenu = null;
    }

    onSelectPattern(value, name) {
      // Try target in container first, then visible input/textarea
      let target = null;
      if (this.container) {
        target = this.container.querySelector('input, textarea');
        if (target && !isVisible(target)) target = null;
      }
      if (!target) {
        const cand = qsa('input, textarea');
        target = cand.find(isVisible) || null;
      }
      if (!target) return;
      try {
        setInputValueReactive(target, value || '');
      } catch (err) {
        console.error('dmm-tg: failed to set input value', err, { value, name });
      }
    }
  }

  /* ===========================
     PageManager - watches for SPA navigations / DOM changes
     =========================== */
  class PageManager {
    constructor() {
      this.buttonManager = new ButtonManager();
      this.lastUrl = location.href;
      this.mutationObserver = null;
      this.retry = 0;
      this.debouncedCheck = debounce(this.checkPage.bind(this), CONFIG.DEBOUNCE_MS);
      this.setupHistoryHooks();
      this.setupMutationObserver();
      this.checkPage(); // initial
    }

    setupHistoryHooks() {
      const push = history.pushState;
      const replace = history.replaceState;
      history.pushState = function pushState(...args) { push.apply(this, args); window.dispatchEvent(new Event('dmm:nav')); };
      history.replaceState = function replaceState(...args) { replace.apply(this, args); window.dispatchEvent(new Event('dmm:nav')); };
      window.addEventListener('popstate', () => window.dispatchEvent(new Event('dmm:nav')));
      window.addEventListener('hashchange', () => window.dispatchEvent(new Event('dmm:nav')));
      window.addEventListener('dmm:nav', () => {
        this.buttonManager.cleanup();
        this.debouncedCheck();
      });
    }

    setupMutationObserver() {
      if (this.mutationObserver) this.mutationObserver.disconnect();
      this.mutationObserver = new MutationObserver((mutations) => {
        for (const m of mutations) {
          if (m.type === 'childList' && m.addedNodes.length > 0) {
            this.debouncedCheck();
            break;
          }
        }
      });
      this.mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    checkPage() {
      const url = location.href;
      // Only operate on target pages
      if (!CONFIG.RELEVANT_PAGE_RX.test(url)) {
        this.buttonManager.cleanup();
        this.lastUrl = url;
        return;
      }

      // find container
      const container = qs(CONFIG.CONTAINER_SELECTOR);
      if (!container) {
        // limited retries to catch late-loading DOM (e.g. framework renders)
        if (this.retry < CONFIG.MAX_RETRIES) {
          this.retry++;
          setTimeout(() => this.debouncedCheck(), 150);
        } else {
          this.retry = 0;
        }
        return;
      }
      this.retry = 0;
      // init manager
      this.buttonManager.initialize(container);
      this.lastUrl = url;
    }
  }

  /* ===========================
     Boot
     =========================== */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(() => {
    try {
      // only continue if we have patterns to show
      if (!BUTTON_DATA.length) return;
      // start page manager
      new PageManager();
    } catch (err) {
      console.error('dmm-tg boot error', err);
    }
  });

})();
