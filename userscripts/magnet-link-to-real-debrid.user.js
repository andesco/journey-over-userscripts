// ==UserScript==
// @name          Magnet Link to Real-Debrid
// @version       2.3.1
// @description   Automatically send magnet links to Real-Debrid
// @author        Journey Over
// @license       MIT
// @match         *://*/*
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@5f2cbff53b0158ca07c86917994df0ed349eb96c/libs/gm/gmcompat.js
// @grant         GM.xmlHttpRequest
// @grant         GM.getValue
// @grant         GM.setValue
// @grant         GM.registerMenuCommand
// @connect       api.real-debrid.com
// @icon          https://www.google.com/s2/favicons?sz=64&domain=real-debrid.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/magnet-link-to-real-debrid.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/magnet-link-to-real-debrid.user.js
// ==/UserScript==

(function() {
  'use strict';

  /* Constants & Utilities */
  const STORAGE_KEY = 'realDebridConfig';
  const API_BASE = 'https://api.real-debrid.com/rest/1.0';
  const ICON_SRC = 'https://fcdn.real-debrid.com/0830/favicons/favicon.ico';
  const INSERTED_ICON_ATTR = 'data-rd-inserted';
  const DEFAULTS = {
    apiKey: '',
    allowedExtensions: ['mp3', 'm4b', 'mp4', 'mkv', 'cbz', 'cbr'],
    filterKeywords: ['sample', 'bloopers', 'trailer'],
    debugMode: false
  };

  // Simple debounce helper for DOM mutation handling
  const debounce = (fn, ms = 120) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  };

  /* Errors */
  class ConfigurationError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ConfigurationError';
    }
  }

  class RealDebridError extends Error {
    constructor(message, statusCode = null) {
      super(message);
      this.name = 'RealDebridError';
      this.statusCode = statusCode;
    }
  }

  /* Config Manager */
  class ConfigManager {
    // Parse stored JSON safely, falling back to null on failure
    static _safeParse(value) {
      if (!value) return null;
      try {
        return typeof value === 'string' ? JSON.parse(value) : value;
      } catch (err) {
        console.warn('Config parse failed, resetting to defaults.', err);
        return null;
      }
    }

    static async getConfig() {
      const stored = await GMC.getValue(STORAGE_KEY);
      const parsed = this._safeParse(stored) || {};
      return {
        ...DEFAULTS,
        ...parsed
      };
    }

    // Persist configuration; API key required
    static async saveConfig(cfg) {
      if (!cfg || !cfg.apiKey) throw new ConfigurationError('API Key is required');
      await GMC.setValue(STORAGE_KEY, JSON.stringify(cfg));
    }

    static validateConfig(cfg) {
      const errors = [];
      if (!cfg || !cfg.apiKey) errors.push('API Key is missing');
      if (!Array.isArray(cfg.allowedExtensions)) errors.push('allowedExtensions must be an array');
      if (!Array.isArray(cfg.filterKeywords)) errors.push('filterKeywords must be an array');
      return errors;
    }
  }

  /* Real-Debrid Service */
  class RealDebridService {
    #apiKey;
    #debug;

    constructor(apiKey, {
      debugMode = false
    } = {}) {
      if (!apiKey) throw new ConfigurationError('API Key required');
      this.#apiKey = apiKey;
      this.#debug = Boolean(debugMode);
    }

    #log(...args) {
      if (this.#debug) console.log('[RealDebridService]', ...args);
    }

    // Generic request wrapper: handles headers, encoding and JSON parsing/errors
    #request(method, endpoint, data = null) {
      return new Promise((resolve, reject) => {
        const url = `${API_BASE}${endpoint}`;
        const payload = data ? new URLSearchParams(data).toString() : null;

        this.#log('request', method, url, data);

        GMC.xmlHttpRequest({
          method,
          url,
          headers: {
            Authorization: `Bearer ${this.#apiKey}`,
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: payload,
          onload: (resp) => {
            this.#log('response', resp.status, resp.responseText && resp.responseText.slice && resp.responseText.slice(0, 500));

            if (!resp || typeof resp.status === 'undefined') {
              return reject(new RealDebridError('Invalid API response'));
            }
            if (resp.status < 200 || resp.status >= 300) {
              const msg = resp.responseText ? resp.responseText : `HTTP ${resp.status}`;
              return reject(new RealDebridError(`API Error: ${msg}`, resp.status));
            }
            if (resp.status === 204 || !resp.responseText) return resolve({});
            try {
              const parsed = JSON.parse(resp.responseText.trim());
              return resolve(parsed);
            } catch (err) {
              this.#log('parse error', err);
              return reject(new RealDebridError(`Failed to parse API response: ${err.message}`, resp.status));
            }
          },
          onerror: (err) => {
            this.#log('network error', err);
            return reject(new RealDebridError('Network request failed'));
          },
          ontimeout: () => {
            this.#log('timeout');
            return reject(new RealDebridError('Request timed out'));
          }
        });
      });
    }

    addMagnet(magnet) {
      return this.#request('POST', '/torrents/addMagnet', {
        magnet
      });
    }

    getTorrentInfo(torrentId) {
      return this.#request('GET', `/torrents/info/${torrentId}`);
    }

    selectFiles(torrentId, filesCsv) {
      return this.#request('POST', `/torrents/selectFiles/${torrentId}`, {
        files: filesCsv
      });
    }

    getExistingTorrents() {
      // Gracefully return an empty array on failure
      return this.#request('GET', '/torrents').catch(() => []);
    }
  }

  /* Magnet Processing */
  class MagnetLinkProcessor {
    #config;
    #api;
    #existing = [];

    constructor(config, api) {
      this.#config = config;
      this.#api = api;
    }

    async initialize() {
      try {
        this.#existing = await this.#api.getExistingTorrents();
        if (this.#config.debugMode) console.log('[MagnetLinkProcessor] existing torrents', this.#existing);
      } catch (err) {
        console.warn('Failed to load existing torrents', err);
        this.#existing = [];
      }
    }

    // Extract BTIH (hash) from magnet link
    static parseMagnetHash(magnetLink) {
      if (!magnetLink || typeof magnetLink !== 'string') return null;
      try {
        const qIdx = magnetLink.indexOf('?');
        const qs = qIdx >= 0 ? magnetLink.slice(qIdx + 1) : magnetLink;
        const params = new URLSearchParams(qs);
        const xt = params.get('xt');
        if (xt) {
          const match = xt.match(/urn:btih:([A-Za-z0-9]+)/i);
          if (match) return match[1].toUpperCase();
        }
        const fallback = magnetLink.match(/xt=urn:btih:([A-Za-z0-9]+)/i);
        if (fallback) return fallback[1].toUpperCase();
        return null;
      } catch (err) {
        const m = magnetLink.match(/xt=urn:btih:([A-Za-z0-9]+)/i);
        return m ? m[1].toUpperCase() : null;
      }
    }

    isTorrentExists(hash) {
      if (!hash) return false;
      return Array.isArray(this.#existing) && this.#existing.some(t => (t.hash || '').toUpperCase() === hash);
    }

    // Filter torrent files by allowed extensions and filter keywords (supports regex-like /.../)
    filterFiles(files = []) {
      const allowed = new Set(this.#config.allowedExtensions.map(s => s.trim().toLowerCase()).filter(Boolean));
      const keywords = (this.#config.filterKeywords || []).map(k => k.trim()).filter(Boolean);

      return (files || []).filter(file => {
        const path = (file.path || '').toLowerCase();
        const name = path.split('/').pop() || '';
        const ext = name.includes('.') ? name.split('.').pop() : '';

        if (!allowed.has(ext)) return false;

        for (const kw of keywords) {
          if (!kw) continue;
          if (kw.startsWith('/') && kw.endsWith('/')) {
            try {
              const re = new RegExp(kw.slice(1, -1), 'i');
              if (re.test(path) || re.test(name)) return false;
            } catch (err) {
              // invalid regex: ignore it
            }
          }
          if (path.includes(kw.toLowerCase()) || name.includes(kw.toLowerCase())) return false;
        }
        return true;
      });
    }

    async processMagnetLink(magnetLink) {
      const hash = MagnetLinkProcessor.parseMagnetHash(magnetLink);
      if (!hash) throw new RealDebridError('Invalid magnet link');

      if (this.isTorrentExists(hash)) throw new RealDebridError('Torrent already exists on Real-Debrid');

      const addResult = await this.#api.addMagnet(magnetLink);
      if (!addResult || typeof addResult.id === 'undefined') {
        throw new RealDebridError('Failed to add magnet');
      }
      const torrentId = addResult.id;

      const info = await this.#api.getTorrentInfo(torrentId);
      const files = Array.isArray(info.files) ? info.files : [];

      const chosen = this.filterFiles(files).map(f => f.id);
      if (!chosen.length) throw new RealDebridError('No matching files found after filtering');

      await this.#api.selectFiles(torrentId, chosen.join(','));
      return chosen.length;
    }
  }

  /* UI Manager */
  class UIManager {
    // Build and return modal dialog DOM. Caller must append it to document.
    static createConfigDialog(currentConfig) {
      const dialog = document.createElement('div');
      dialog.innerHTML = `
          <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;z-index:10000;font-family:Arial,sans-serif;">
              <div style="background:#1e1e2f;color:#ffffff;padding:35px;border-radius:16px;max-width:500px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,0.5);border:1px solid #2c2c3a;">
                  <h2 style="text-align:center;color:#4db6ac;margin-bottom:25px;border-bottom:2px solid #4db6ac;padding-bottom:12px;">Real-Debrid Configuration</h2>

                  <div style="margin-bottom:20px;">
                      <label style="display:block;margin-bottom:8px;font-weight:bold;color:#b2ebf2;">API Key</label>
                      <input type="text" id="apiKey" placeholder="Enter your Real-Debrid API Key" value="${currentConfig.apiKey}"
                          style="width:100%;padding:12px;border:1px solid #4db6ac;border-radius:8px;background-color:#2c2c3a;color:#ffffff;">
                  </div>

                  <div style="margin-bottom:20px;">
                      <label style="display:block;margin-bottom:8px;font-weight:bold;color:#b2ebf2;">Allowed Extensions</label>
                      <textarea id="extensions" placeholder="Enter file extensions to allow"
                          style="width:100%;padding:12px;border:1px solid #4db6ac;border-radius:8px;background-color:#2c2c3a;color:#ffffff;min-height:80px;">${currentConfig.allowedExtensions.join(',')}</textarea>
                      <small style="color:#80cbc4;display:block;margin-top:6px;">Separate extensions with commas (e.g., mp4,mkv,avi)</small>
                  </div>

                  <div style="margin-bottom:20px;">
                      <label style="display:block;margin-bottom:8px;font-weight:bold;color:#b2ebf2;">Filter Keywords</label>
                      <textarea id="keywords" placeholder="Enter keywords to filter out"
                          style="width:100%;padding:12px;border:1px solid #4db6ac;border-radius:8px;background-color:#2c2c3a;color:#ffffff;min-height:80px;">${currentConfig.filterKeywords.join(',')}</textarea>
                      <small style="color:#80cbc4;display:block;margin-top:6px;">Separate keywords with commas (e.g., sample, /trailer/, /featurette?s/)</small>
                  </div>

                  <div style="margin-bottom:20px;">
                      <label style="display:flex;align-items:center;color:#b2ebf2;">
                          <input type="checkbox" id="debugMode" ${currentConfig.debugMode ? 'checked' : ''}
                              style="margin-right:12px;width:18px;height:18px;border-radius:4px;background-color:#2c2c3a;border:2px solid #4db6ac;">
                          Enable Debug Mode
                      </label>
                      <small style="color:#80cbc4;display:block;margin-top:6px;">Provides additional logging in the browser console</small>
                  </div>

                  <div style="display:flex;justify-content:space-between;margin-top:25px;">
                      <button id="saveBtn" style="background:#4db6ac;color:#1e1e2f;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;transition:all 0.3s ease-in-out;font-weight:bold;">Save</button>
                      <button id="cancelBtn" style="background:#e57373;color:#1e1e2f;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;transition:all 0.3s ease-in-out;font-weight:bold;">Cancel</button>
                  </div>
              </div>
          </div>
      `;

      const saveBtn = dialog.querySelector('#saveBtn');
      const cancelBtn = dialog.querySelector('#cancelBtn');

      saveBtn.addEventListener('mouseover', () => saveBtn.style.background = '#2980b9');
      saveBtn.addEventListener('mouseout', () => saveBtn.style.background = '#4db6ac');

      cancelBtn.addEventListener('mouseover', () => cancelBtn.style.background = '#c0392b');
      cancelBtn.addEventListener('mouseout', () => cancelBtn.style.background = '#e57373');

      // ESC key handler: remove dialog on Escape
      const escHandler = (e) => {
        if (e.key === 'Escape') {
          if (dialog.parentNode) dialog.parentNode.removeChild(dialog);
          document.removeEventListener('keydown', escHandler);
        }
      };
      document.addEventListener('keydown', escHandler);
      dialog._escHandler = escHandler;

      return dialog;
    }

    static showToast(message, type = 'info') {
      const colors = {
        success: '#16a34a',
        error: '#dc2626',
        info: '#2563eb'
      };
      const msgDiv = document.createElement('div');
      Object.assign(msgDiv.style, {
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        backgroundColor: colors[type] || colors.info,
        color: 'white',
        padding: '10px 14px',
        borderRadius: '8px',
        zIndex: 10000,
        fontWeight: '600'
      });
      msgDiv.textContent = message;
      document.body.appendChild(msgDiv);
      setTimeout(() => msgDiv.remove(), 3000);
    }

    static createMagnetIcon() {
      const icon = document.createElement('img');
      icon.src = ICON_SRC;
      icon.style.cursor = 'pointer';
      icon.style.width = '16px';
      icon.style.marginLeft = '5px';
      icon.setAttribute(INSERTED_ICON_ATTR, '1');
      return icon;
    }
  }

  /* Page Integration: find magnet links & insert icons (one icon per unique magnet) */
  class PageIntegrator {
    constructor(processor = null) {
      this.processor = processor;
      this.observer = null;
      this.configPromise = ConfigManager.getConfig();
      this.keyToIcon = new Map();
      this._populateFromDOM();
    }

    setProcessor(processor) {
      this.processor = processor;
    }

    _populateFromDOM() {
      try {
        const links = Array.from(document.querySelectorAll('a[href^="magnet:"]'));
        links.forEach(link => {
          const next = link.nextElementSibling;
          if (next && next.getAttribute && next.getAttribute(INSERTED_ICON_ATTR)) {
            const key = this._magnetKeyFor(link.href) || `href:${link.href.trim().toLowerCase()}`;
            if (!this.keyToIcon.has(key)) this.keyToIcon.set(key, next);
          }
        });
      } catch (err) {
        // ignore DOM inspection errors
      }
    }

    _magnetKeyFor(href) {
      const hash = MagnetLinkProcessor.parseMagnetHash(href);
      if (hash) return `hash:${hash}`;
      try {
        return `href:${href.trim().toLowerCase()}`;
      } catch {
        return `href:${String(href).trim().toLowerCase()}`;
      }
    }

    // Attach click behavior to the icon: lazily initializes API and processes magnet
    _attach(icon, link) {
      icon.addEventListener('click', async (ev) => {
        ev.preventDefault();

        const key = this._magnetKeyFor(link.href);
        const ok = await ensureApiInitialized();
        if (!ok) {
          UIManager.showToast('Real-Debrid API key not configured. Use the menu to set it.', 'info');
          return;
        }

        if (key && key.startsWith('hash:') && this.processor && this.processor.isTorrentExists(key.split(':')[1])) {
          UIManager.showToast('Torrent already exists on Real-Debrid', 'info');
          icon.title = 'Already on Real-Debrid';
          icon.style.filter = 'grayscale(100%)';
          icon.style.opacity = '0.65';
          return;
        }

        try {
          const count = await this.processor.processMagnetLink(link.href);
          UIManager.showToast(`Added to Real-Debrid — ${count} file(s) selected`, 'success');
          icon.style.filter = 'grayscale(100%)';
          icon.style.opacity = '0.65';
          icon.title = 'Added to Real-Debrid';
        } catch (err) {
          UIManager.showToast(err && err.message ? err.message : 'Failed to process magnet', 'error');
          console.error(err);
        }
      }, {
        once: false
      });
    }

    addIconsTo(documentRoot = document) {
      const links = Array.from(documentRoot.querySelectorAll('a[href^="magnet:"]'));
      const newlyAddedKeys = [];
      links.forEach(link => {
        if (!link.parentNode) return;
        const next = link.nextElementSibling;
        if (next && next.getAttribute && next.getAttribute(INSERTED_ICON_ATTR)) return;

        const key = this._magnetKeyFor(link.href);
        if (key && this.keyToIcon.has(key)) return;

        const icon = UIManager.createMagnetIcon();
        this._attach(icon, link);
        link.parentNode.insertBefore(icon, link.nextSibling);
        const storeKey = key || `href:${link.href.trim().toLowerCase()}`;
        this.keyToIcon.set(storeKey, icon);
        newlyAddedKeys.push(storeKey);
      });

      if (newlyAddedKeys.length) {
        ensureApiInitialized().then(ok => {
          if (ok) this.markExistingTorrents();
        });
      }
    }

    markExistingTorrents() {
      if (!this.processor) return;
      for (const [key, icon] of this.keyToIcon.entries()) {
        if (!key.startsWith('hash:')) continue;
        const hash = key.split(':')[1];
        if (this.processor.isTorrentExists(hash)) {
          icon.title = 'Already on Real-Debrid';
          icon.style.filter = 'grayscale(100%)';
          icon.style.opacity = '0.65';
        }
      }
    }

    startObserving() {
      if (this.observer) return;
      this.observer = new MutationObserver(debounce((mutations) => {
        for (const m of mutations) {
          if (m.addedNodes && m.addedNodes.length) {
            this.addIconsTo(document);
            break;
          }
        }
      }, 180));
      this.observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    stopObserving() {
      if (!this.observer) return;
      this.observer.disconnect();
      this.observer = null;
    }
  }

  /* Lazy API initialization - only when needed; cached promise so it runs once */
  let _apiInitPromise = null;
  let _apiAvailable = false;
  let _realDebridService = null;
  let _magnetProcessor = null;
  let _integratorInstance = null;

  async function ensureApiInitialized() {
    if (_apiInitPromise) return _apiInitPromise;
    const cfg = await ConfigManager.getConfig();
    if (!cfg.apiKey) {
      _apiAvailable = false;
      return Promise.resolve(false);
    }

    try {
      _realDebridService = new RealDebridService(cfg.apiKey, cfg);
    } catch (err) {
      console.warn('RealDebridService not created:', err);
      _apiAvailable = false;
      return Promise.resolve(false);
    }

    _magnetProcessor = new MagnetLinkProcessor(cfg, _realDebridService);
    _apiInitPromise = _magnetProcessor.initialize()
      .then(() => {
        _apiAvailable = true;
        if (_integratorInstance) {
          _integratorInstance.setProcessor(_magnetProcessor);
          _integratorInstance.markExistingTorrents();
        }
        return true;
      })
      .catch(err => {
        console.warn('Failed to initialize Real-Debrid integration', err);
        _apiAvailable = false;
        return false;
      });

    return _apiInitPromise;
  }

  /* Initialization & Menu */
  async function init() {
    try {
      _integratorInstance = new PageIntegrator(null);
      _integratorInstance.addIconsTo();
      _integratorInstance.startObserving();

      GMC.registerMenuCommand('Configure Real-Debrid Settings', async () => {
        const currentCfg = await ConfigManager.getConfig();
        const dialog = UIManager.createConfigDialog(currentCfg);
        document.body.appendChild(dialog);

        const saveBtn = dialog.querySelector('#saveBtn');
        const cancelBtn = dialog.querySelector('#cancelBtn');

        saveBtn.addEventListener('click', async () => {
          const newCfg = {
            apiKey: dialog.querySelector('#apiKey').value.trim(),
            allowedExtensions: dialog.querySelector('#extensions').value.split(',').map(e => e.trim()).filter(Boolean),
            filterKeywords: dialog.querySelector('#keywords').value.split(',').map(k => k.trim()).filter(Boolean),
            debugMode: dialog.querySelector('#debugMode').checked
          };
          try {
            await ConfigManager.saveConfig(newCfg);
            if (dialog.parentNode) document.body.removeChild(dialog);
            if (dialog._escHandler) document.removeEventListener('keydown', dialog._escHandler);
            UIManager.showToast('Configuration saved successfully!', 'success');
            location.reload();
          } catch (error) {
            UIManager.showToast(error.message, 'error');
          }
        });

        cancelBtn.addEventListener('click', () => {
          if (dialog.parentNode) document.body.removeChild(dialog);
          if (dialog._escHandler) document.removeEventListener('keydown', dialog._escHandler);
        });

        const apiInput = dialog.querySelector('#apiKey');
        if (apiInput) apiInput.focus();
      });
    } catch (err) {
      console.error('Initialization failed:', err);
    }
  }

  // Run immediately
  init();

})();
