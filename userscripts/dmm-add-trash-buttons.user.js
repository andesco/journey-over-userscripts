// ==UserScript==
// @name          DMM - Add Trash Guide Regex Buttons
// @version       2.2.1
// @description   Adds buttons to Debrid Media Manager for applying Trash Guide regex patterns.
// @author        Journey Over
// @license       MIT
// @match         *://debridmediamanager.com/*
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@f7bfd16f830e9bfdd6c261e5c2b414fe90cf7455/libs/dmm/button-data.min.js
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@5f2cbff53b0158ca07c86917994df0ed349eb96c/libs/gm/gmcompat.js
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@3f583300710ef7fa14d141febac3c8a2055fa5f8/libs/utils/utils.js
// @grant         GM.getValue
// @grant         GM.setValue
// @icon          https://www.google.com/s2/favicons?sz=64&domain=debridmediamanager.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/dmm-add-trash-buttons.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/dmm-add-trash-buttons.user.js
// ==/UserScript==

(function() {
  'use strict';

  const logger = Logger('DMM - Add Trash Guide Regex Buttons', { debug: false });

  const CONFIG = {
    CONTAINER_SELECTOR: '.mb-2',
    RELEVANT_PAGE_RX: /debridmediamanager\.com\/(movie|show)\/[^\/]+/,
    CSS_CLASS_PREFIX: 'dmm-tg',
    STORAGE_KEY: 'dmm-tg-quality-options',
    LOGIC_STORAGE_KEY: 'dmm-tg-logic-mode'
  };

  // Ensure BUTTON_DATA is a valid array
  const BUTTON_DATA = Array.isArray(window?.DMM_BUTTON_DATA) ? window.DMM_BUTTON_DATA : [];

  /**
   * Quality tokens used for building regex patterns
   * Each token defines search patterns for common video quality indicators
   */
  const QUALITY_TOKENS = [
    { key: '720p', name: '720p', values: ['720p'] },
    { key: '1080p', name: '1080p', values: ['1080p'] },
    { key: '4k', name: '4k', values: ['\\b4k\\b', '2160p'] },
    { key: 'dv', name: 'Dolby Vision', values: ['dovi', '\\bdv\\b', 'dolby', 'vision'] },
    { key: 'x264', name: 'x264', values: ['[xh][\\s._-]?264'] },
    { key: 'x265', name: 'x265', values: ['[xh][\\s._-]?265', '\\bHEVC\\b'] },
    { key: 'hdr', name: 'HDR', values: ['hdr'] },
    { key: 'remux', name: 'Remux', values: ['remux'] }
  ];

  // DOM utility functions
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const isVisible = (el) => !!(el && el.offsetParent !== null && getComputedStyle(el).visibility !== 'hidden');

  /**
   * Gets the native value setter for React compatibility
   * React overrides input.value, so we need the original setter
   */
  const getNativeValueSetter = (el) => {
    const proto = el instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    return desc && desc.set;
  };

  /**
   * Sets input value in a way that triggers React re-renders
   * This ensures the framework sees the value change and updates accordingly
   */
  const setInputValueReactive = (el, value) => {
    const nativeSetter = getNativeValueSetter(el);
    if (nativeSetter) {
      nativeSetter.call(el, value);
    } else {
      el.value = value;
    }

    // Set focus and cursor position for better UX
    try {
      el.focus();
      if (typeof el.setSelectionRange === 'function') el.setSelectionRange(value.length, value.length);
    } catch (err) { /* Ignore focus errors */ }

    // Trigger events that React listens for
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));

    // Handle React's internal value tracking if present
    try {
      if (el._valueTracker && typeof el._valueTracker.setValue === 'function') {
        el._valueTracker.setValue(value);
      }
    } catch (err) { /* Ignore React internals errors */ }
  };

  /**
   * Extracts quality tokens from existing regex patterns
   * Handles both OR patterns like "(1080p|4k|hdr)" and AND patterns with lookaheads
   */
  const parseQualityFromRegex = (regex) => {
    if (!regex || typeof regex !== 'string') return [];

    // Check for OR pattern at end: (token1|token2|token3)
    const orMatch = regex.match(/\(([^)]+)\)$/);
    if (orMatch) {
      return orMatch[1].split('|');
    }

    // Check for AND patterns with positive lookaheads: (?=.*token)
    const lookaheadRE = /\(\?\=\.\*((?:\([^)]*\)|[^)])*)\)/g;
    const matches = [];
    let m;
    while ((m = lookaheadRE.exec(regex)) !== null) {
      matches.push(m[1]);
    }
    return matches;
  };

  /**
   * Removes quality-related patterns from regex to get the base pattern
   * This prevents accumulation of quality patterns when switching between options
   */
  const removeQualityFromRegex = (regex) => {
    if (!regex || typeof regex !== 'string') return '';

    let cleaned = regex;

    // Remove OR patterns at end
    cleaned = cleaned.replace(/\s*\([^)]+\)$/, '');

    // Remove AND lookahead patterns
    cleaned = cleaned.replace(/\s*\(\?\=\.\*((?:\([^)]*\)|[^)])*)\)/g, '');

    return cleaned.trim();
  };

  /**
   * Builds quality regex string based on selected options and logic mode
   * @param {string[]} selectedOptions - Array of selected quality token keys
   * @param {boolean} useAndLogic - Whether to use AND logic (true) or OR logic (false)
   * @returns {string} Constructed regex pattern
   */
  const buildQualityString = (selectedOptions, useAndLogic = false) => {
    if (!selectedOptions.length) return '';

    // Gather all regex values for selected quality tokens
    const tokenValues = [];
    selectedOptions.forEach((optionKey) => {
      const token = QUALITY_TOKENS.find((q) => q.key === optionKey);
      if (token && token.values) tokenValues.push(token.values);
    });

    if (!tokenValues.length) return '';

    if (useAndLogic) {
      // AND logic: Each token must be present, use positive lookaheads
      const lookaheads = tokenValues.map(vals => {
        if (vals.length === 1) {
          return `(?=.*${vals[0]})`;
        }
        // Multiple values for one token = internal OR with non-capturing group
        return `(?=.*(?:${vals.join('|')}))`;
      }).join('');
      return lookaheads;
    } else {
      // OR logic: Any token can match, flatten all values
      const flat = tokenValues.flat();
      return `(${flat.join('|')})`;
    }
  };

  /**
   * Injects CSS styles for the UI components
   * Creates a cohesive dark theme that matches DMM's design
   */
  (function injectStyles() {
    const p = CONFIG.CSS_CLASS_PREFIX;
    const css = `
      .${p}-btn{cursor:pointer;display:inline-flex;align-items:center;gap:.35rem;margin-right:.5rem;padding:.25rem .5rem;font-size:12px;line-height:1;border-radius:.375rem;color:#e6f0ff;background:rgba(15,23,42,.5);border:1px solid rgba(59,130,246,.55);box-shadow:none;user-select:none;white-space:nowrap;}
      .${p}-btn:hover{background:rgba(59,130,246,.08);}
      .${p}-btn:focus{outline:2px solid rgba(59,130,246,.18);outline-offset:2px;}
      .${p}-chev{width:12px;height:12px;color:rgba(226,240,255,.95);margin-left:.15rem;display:inline-block;transition:transform 160ms ease;transform-origin:center;}
      .${p}-btn[aria-expanded="true"] .${p}-chev{transform:rotate(180deg);}
      .${p}-menu{position:absolute;min-width:10rem;background:#111827;color:#fff;border:1px solid rgba(148,163,184,.06);border-radius:.375rem;box-shadow:0 6px 18px rgba(2,6,23,.6);padding:.25rem 0;z-index:9999;display:none;}
      .${p}-menu::before{content:"";position:absolute;top:-6px;left:12px;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-bottom:6px solid #111827;}
      .${p}-item{padding:.45rem .75rem;cursor:pointer;font-size:13px;white-space:nowrap;border-bottom:1px solid rgba(255,255,255,.03);}
      .${p}-item:last-child{border-bottom:none;}
      .${p}-item:hover{background:#1f2937;}
      .${p}-quality-section{display:flex;align-items:center;gap:.75rem;margin-left:.75rem;padding-left:.75rem;border-left:1px solid rgba(148,163,184,.15);}
      .${p}-quality-grid{display:flex;flex-wrap:wrap;gap:.6rem;}
      .${p}-quality-item{display:inline-flex;align-items:center;font-size:12px;}
      .${p}-quality-button{padding:.25rem .5rem;border-radius:.375rem;border:1px solid rgba(148,163,184,.15);background:transparent;color:#e6f0ff;cursor:pointer;font-size:12px;line-height:1}
      .${p}-quality-button.active{background:#3b82f6;color:#fff;border-color:#3b82f6}
      .${p}-quality-button:focus{outline:1px solid rgba(59,130,246,.5);}
      .${p}-quality-label{color:#e6f0ff;cursor:pointer;white-space:nowrap;}
      .${p}-logic-selector{margin-right:.75rem;padding-right:.75rem;border-right:1px solid rgba(148,163,184,.15);}
      .${p}-logic-select{background:#1f2937;color:#e6f0ff;border:1px solid rgba(148,163,184,.4);border-radius:4px;padding:.2rem .4rem;font-size:11px;cursor:pointer;}
      .${p}-logic-select:focus{outline:1px solid rgba(59,130,246,.5);}
    `;
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
  })();

  /**
   * Manages quality selection buttons and logic mode
   * Persists user preferences and handles regex generation
   */
  class QualityManager {
    constructor() {
      this.selectedOptions = [];
      this.useAndLogic = false;
      this.container = null;
      this.buttons = new Map();
      this.logicSelect = null;
    }

    async initialize(container) {
      this.container = container;
      this.createQualitySection();
      await this.loadPersistedSettings();
      this.restoreStates();

      // Auto-apply quality options if any are selected
      if (this.selectedOptions.length > 0) {
        setTimeout(() => this.updateInputWithQualityOptions(), 50);
      }
    }

    async loadPersistedSettings() {
      try {
        const stored = await GMC.getValue(CONFIG.STORAGE_KEY, null);
        this.selectedOptions = stored ? JSON.parse(stored) : [];

        const logicStored = await GMC.getValue(CONFIG.LOGIC_STORAGE_KEY, null);
        this.useAndLogic = logicStored ? JSON.parse(logicStored) : false;
      } catch (err) {
        logger.error('dmm-tg: failed to load quality options', err);
        this.selectedOptions = [];
        this.useAndLogic = false;
      }
    }

    /**
     * Creates the quality selection UI with buttons and logic selector
     */
    createQualitySection() {
      if (!this.container) return;

      // Remove any existing section to prevent duplicates
      const existing = this.container.querySelector(`.${CONFIG.CSS_CLASS_PREFIX}-quality-section`);
      if (existing) existing.remove();

      const section = document.createElement('div');
      section.className = `${CONFIG.CSS_CLASS_PREFIX}-quality-section`;

      // AND/OR logic selector dropdown
      const logicSelector = document.createElement('div');
      logicSelector.className = `${CONFIG.CSS_CLASS_PREFIX}-logic-selector`;

      const logicSelect = document.createElement('select');
      logicSelect.className = `${CONFIG.CSS_CLASS_PREFIX}-logic-select`;
      logicSelect.innerHTML = `
        <option value="or">OR</option>
        <option value="and">AND</option>
      `;
      logicSelect.addEventListener('change', (e) => this.onLogicChange(e.target.value === 'and'));

      logicSelector.appendChild(logicSelect);
      this.logicSelect = logicSelect;

      // Quality token buttons
      const grid = document.createElement('div');
      grid.className = `${CONFIG.CSS_CLASS_PREFIX}-quality-grid`;

      QUALITY_TOKENS.forEach((token) => {
        const item = document.createElement('div');
        item.className = `${CONFIG.CSS_CLASS_PREFIX}-quality-item`;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `${CONFIG.CSS_CLASS_PREFIX}-quality-button`;
        btn.id = `${CONFIG.CSS_CLASS_PREFIX}-${token.key}`;
        btn.textContent = token.name;
        btn.addEventListener('click', () => this.onToggleOption(token.key, btn));

        item.appendChild(btn);
        grid.appendChild(item);

        this.buttons.set(token.key, btn);
      });

      section.appendChild(logicSelector);
      section.appendChild(grid);
      this.container.appendChild(section);
    }

    /**
     * Restores UI state from saved preferences
     */
    restoreStates() {
      this.selectedOptions.forEach((key) => {
        const btn = this.buttons.get(key);
        if (btn) btn.classList.add(`${CONFIG.CSS_CLASS_PREFIX}-quality-button`), btn.classList.add('active');
      });

      if (this.logicSelect) {
        this.logicSelect.value = this.useAndLogic ? 'and' : 'or';
      }
    }

    onLogicChange(useAndLogic) {
      this.useAndLogic = useAndLogic;

      try {
        GMC.setValue(CONFIG.LOGIC_STORAGE_KEY, JSON.stringify(this.useAndLogic));
      } catch (err) {
        logger.error('dmm-tg: failed to save logic mode', err);
      }

      this.updateInputWithQualityOptions();
    }

    /**
     * Toggle option handler for button UI
     */
    onToggleOption(key, btn) {
      const isActive = btn.classList.contains('active');
      if (isActive) {
        btn.classList.remove('active');
        const idx = this.selectedOptions.indexOf(key);
        if (idx > -1) this.selectedOptions.splice(idx, 1);
      } else {
        btn.classList.add('active');
        if (!this.selectedOptions.includes(key)) this.selectedOptions.push(key);
      }

      try {
        GMC.setValue(CONFIG.STORAGE_KEY, JSON.stringify(this.selectedOptions));
      } catch (err) {
        logger.error('dmm-tg: failed to save quality options', err);
      }

      this.updateInputWithQualityOptions();
    }

    /**
     * Updates the input field with current quality options
     * Prevents regex pattern duplication by cleaning the base pattern first
     */
    updateInputWithQualityOptions() {
      const target = this.findTargetInput();
      if (!target) return;

      const currentValue = target.value || '';
      // Clean existing quality patterns to prevent duplication
      const baseRegex = removeQualityFromRegex(currentValue);
      const qualityString = buildQualityString(this.selectedOptions, this.useAndLogic);

      // Construct new value with proper spacing
      const newValue = baseRegex + (qualityString ? (baseRegex ? ' ' : '') + qualityString : '');

      setInputValueReactive(target, newValue.trim());
    }

    /**
     * Applies quality options to a base regex pattern
     * Used when selecting patterns from dropdown buttons
     */
    applyQualityOptionsToValue(baseValue) {
      const qualityString = buildQualityString(this.selectedOptions, this.useAndLogic);
      const cleanBase = baseValue || '';
      return cleanBase + (qualityString ? (cleanBase ? ' ' : '') + qualityString : '');
    }

    /**
     * Finds the target input element using priority-based search
     * Prefers #query, falls back to container inputs, then any visible input
     */
    findTargetInput() {
      // Primary target: #query input
      let target = qs('#query');
      if (target && isVisible(target)) return target;

      // Secondary: inputs within our container
      if (this.container) {
        target = this.container.querySelector('input, textarea');
        if (target && isVisible(target)) return target;
      }

      // Fallback: any visible input
      const candidates = qsa('input, textarea');
      target = candidates.find(isVisible) || null;
      return target;
    }

    cleanup() {
      this.buttons.clear();
      const existing = this.container?.querySelector(`.${CONFIG.CSS_CLASS_PREFIX}-quality-section`);
      if (existing) existing.remove();
    }
  }

  /**
   * Manages dropdown buttons and their menus
   * Handles button creation, menu positioning, and pattern selection
   */
  class ButtonManager {
    constructor() {
      this.dropdowns = new Map();
      this.container = null;
      this.openMenu = null;
      this.qualityManager = new QualityManager();

      // Bind event handlers for proper 'this' context
      this.documentClickHandler = this.onDocumentClick.bind(this);
      this.resizeHandler = this.onWindowResize.bind(this);
      this.keydownHandler = this.onDocumentKeydown.bind(this);
    }

    cleanup() {
      for (const { button, menu } of this.dropdowns.values()) {
        button.remove();
        menu.remove();
      }
      this.dropdowns.clear();
      this.qualityManager.cleanup();
      this.container = null;
      this.openMenu = null;

      // Remove global event listeners
      document.removeEventListener('click', this.documentClickHandler, true);
      document.removeEventListener('keydown', this.keydownHandler);
      window.removeEventListener('resize', this.resizeHandler);
    }

    async initialize(container) {
      if (!container || this.container === container) return;
      logger.debug('ButtonManager.initialize called', { container: !!container, sameContainer: this.container === container });
      this.cleanup();
      this.container = container;

      // Create buttons for each pattern group
      BUTTON_DATA.forEach((spec) => {
        const name = String(spec.name || 'Pattern');
        if (this.dropdowns.has(name)) return;

        const btn = this._createButton(name);
        const menu = this._createMenu(spec.buttonData || [], name);

        document.body.appendChild(menu);
        this.container.appendChild(btn);
        this.dropdowns.set(name, { button: btn, menu });

        btn.addEventListener('click', (ev) => {
          ev.stopPropagation();
          this.toggleMenu(name);
        });
      });

      await this.qualityManager.initialize(container);
      logger.debug('ButtonManager: created dropdowns', { count: this.dropdowns.size });

      // Set up global event listeners for menu management
      document.addEventListener('click', this.documentClickHandler, true);
      document.addEventListener('keydown', this.keydownHandler);
      window.addEventListener('resize', this.resizeHandler);
    }

    onDocumentKeydown(e) {
      if (!this.openMenu) return;
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        this.closeOpenMenu();
      }
    }

    /**
     * Creates a dropdown button with chevron icon
     */
    _createButton(name) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `${CONFIG.CSS_CLASS_PREFIX}-btn`;
      btn.appendChild(document.createTextNode(name));

      // Add chevron SVG icon
      const svgNs = 'http://www.w3.org/2000/svg';
      const chev = document.createElementNS(svgNs, 'svg');
      chev.setAttribute('viewBox', '0 0 20 20');
      chev.setAttribute('aria-hidden', 'true');
      chev.setAttribute('class', `${CONFIG.CSS_CLASS_PREFIX}-chev`);
      chev.innerHTML = '<path d="M6 8l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />';
      btn.appendChild(chev);

      // Accessibility attributes
      btn.setAttribute('aria-haspopup', 'true');
      btn.setAttribute('aria-expanded', 'false');
      btn.tabIndex = 0;
      return btn;
    }

    /**
     * Creates dropdown menu with pattern items
     */
    _createMenu(items = [], name) {
      const menu = document.createElement('div');
      menu.className = `${CONFIG.CSS_CLASS_PREFIX}-menu`;
      menu.dataset.owner = name;

      items.forEach((it) => {
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

      // Close other open menus
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

    /**
     * Positions dropdown menu below its button with proper viewport constraints
     */
    positionMenuUnderButton(menu, button) {
      const rect = button.getBoundingClientRect();
      const left = Math.max(8, rect.left);
      const top = window.scrollY + rect.bottom + 6;
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    }

    onDocumentClick(e) {
      if (!this.openMenu) return;
      const target = e.target;
      const matchingButton = Array.from(this.dropdowns.values()).find((v) => v.menu === this.openMenu)?.button;
      if (matchingButton && (matchingButton.contains(target) || this.openMenu.contains(target))) return;
      this.closeOpenMenu();
    }

    onWindowResize() {
      if (!this.openMenu) return;
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

    /**
     * Handles pattern selection from dropdown menus
     * Applies base pattern with quality options and sets input value
     */
    onSelectPattern(value, name) {
      let target = this.findTargetInput();

      if (!target) {
        logger.error('dmm-tg: could not find target input element', { name, value });
        return;
      }

      try {
        const finalValue = this.qualityManager.applyQualityOptionsToValue(value || '');
        logger.debug('Applying pattern to target', { name, value, finalValue, targetId: target.id || null });
        setInputValueReactive(target, finalValue);
      } catch (err) {
        logger.error('dmm-tg: failed to set input value', err, {
          value,
          name,
          target: target?.id || target?.className || 'unknown'
        });
      }
    }

    /**
     * Finds target input using same logic as QualityManager
     */
    findTargetInput() {
      let target = qs('#query');
      if (!target || !isVisible(target)) {
        if (this.container) {
          target = this.container.querySelector('input, textarea');
          if (target && !isVisible(target)) target = null;
        }
        if (!target) {
          const candidates = qsa('input, textarea');
          target = candidates.find(isVisible) || null;
        }
      }
      return target;
    }
  }

  /**
   * Manages SPA navigation detection and DOM change monitoring
   * Handles initialization and cleanup when navigating between pages
   */
  class PageManager {
    constructor() {
      this.buttonManager = new ButtonManager();
      this.lastUrl = location.href;
      this.pendingWait = false;
      this.debouncedCheck = debounce(this.checkPage.bind(this), 150);

      this.setupHistoryHooks();
      this.checkPage();
    }

    /**
     * Hooks into browser history API to detect SPA navigation
     */
    setupHistoryHooks() {
      const push = history.pushState;
      const replace = history.replaceState;

      // Override pushState to emit custom navigation event
      history.pushState = function pushState(...args) {
        push.apply(this, args);
        window.dispatchEvent(new Event('dmm:nav'));
      };

      // Override replaceState to emit custom navigation event
      history.replaceState = function replaceState(...args) {
        replace.apply(this, args);
        window.dispatchEvent(new Event('dmm:nav'));
      };

      // Listen for all navigation events
      window.addEventListener('popstate', () => window.dispatchEvent(new Event('dmm:nav')));
      window.addEventListener('hashchange', () => window.dispatchEvent(new Event('dmm:nav')));
      window.addEventListener('dmm:nav', () => {
        this.buttonManager.cleanup();
        this.debouncedCheck();
      });
    }

    /**
     * Checks current page and initializes buttons if on relevant page
     * Uses waitForElement for SPA pages that load content asynchronously
     */
    async checkPage() {
      const url = location.href;

      // Only run on movie/show pages
      if (!CONFIG.RELEVANT_PAGE_RX.test(url)) {
        this.buttonManager.cleanup();
        this.lastUrl = url;
        return;
      }

      // If the container is present, initialize immediately
      const container = qs(CONFIG.CONTAINER_SELECTOR);
      if (container) {
        this.pendingWait = false;
        await this.buttonManager.initialize(container);
        this.lastUrl = url;
        return;
      }

      // If a wait is already pending, avoid creating another observer
      if (this.pendingWait) return;

      // Wait for the container using waitForElement
      this.pendingWait = true;
      waitForElement(CONFIG.CONTAINER_SELECTOR)
        .then(async (el) => {
          this.pendingWait = false;
          // Ensure we are still on a relevant page
          if (!CONFIG.RELEVANT_PAGE_RX.test(location.href)) return;
          await this.buttonManager.initialize(el);
          this.lastUrl = location.href;
        })
        .catch(err => {
          this.pendingWait = false;
          logger.error('waitForElement timeout', err);
        });
    }
  }

  /**
   * Initialize when DOM is ready
   */
  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(() => {
    try {
      if (!BUTTON_DATA.length) return;
      // Wait for the primary container to exist before booting the PageManager
      waitForElement(CONFIG.CONTAINER_SELECTOR)
        .then(() => new PageManager())
        .catch(err => logger.error('waitForElement timeout', err));
    } catch (err) {
      logger.error('dmm-tg boot error', err);
    }
  });
})();
