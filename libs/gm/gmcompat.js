// ==UserScript==
// @author       Journey Over
// @exclude      *
// ==UserLibrary==
// @name         @journeyover/gmcompat
// @description  GM Compatibility Layer
// @license      MIT
// @version      1.0.1
// @homepageURL  https://github.com/StylusThemes/Userscripts
// ==/UserLibrary==
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.deleteValue
// @grant        GM.listValues
// @grant        GM.xmlHttpRequest
// @grant        GM.notification
// @grant        GM.registerMenuCommand
// @grant        GM.addStyle
// @grant        GM.openInTab
// @grant        GM.download
// @grant        GM.getResourceText
// @grant        GM.getResourceURL
// @grant        GM.setClipboard
// @grant        GM.getTab
// @grant        GM.saveAs
// ==/UserScript==

const GMC = (function() {
  const hasGM = typeof GM !== 'undefined' && GM !== null;
  const hasLegacy = typeof GM_getValue !== 'undefined' || typeof GM_setValue !== 'undefined';
  const LS_PREFIX = '__gmcompat__::';

  // --- Helpers ---
  const isFunction = (v) => typeof v === 'function';
  const tryCall = (fn, ...args) => {
    try {
      return fn(...args);
    } catch (e) {
      throw e;
    }
  };

  // --- Storage (Promise-based) ---
  async function getValue(key, defaultValue = undefined) {
    if (hasGM && isFunction(GM.getValue)) return await GM.getValue(key, defaultValue);
    if (typeof GM_getValue === 'function') {
      try {
        const v = GM_getValue(key);
        return v === undefined ? defaultValue : v;
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.reject(new Error('GM.getValue not available in this environment'));
  }

  function setValue(key, value) {
    if (hasGM && isFunction(GM.setValue)) return GM.setValue(key, value);
    if (typeof GM_setValue === 'function') {
      try {
        GM_setValue(key, value);
        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.reject(new Error('GM.setValue not available in this environment'));
  }

  function deleteValue(key) {
    if (hasGM && isFunction(GM.deleteValue)) return GM.deleteValue(key);
    if (typeof GM_deleteValue === 'function') {
      try {
        GM_deleteValue(key);
        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.reject(new Error('GM.deleteValue not available in this environment'));
  }

  function listValues() {
    if (hasGM && isFunction(GM.listValues)) return GM.listValues();
    if (typeof GM_listValues === 'function') {
      try {
        return Promise.resolve(GM_listValues());
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.reject(new Error('GM.listValues not available in this environment'));
  }

  // --- XHR / fetch ---
  function xmlHttpRequest(details = {}) {
    return new Promise((resolve, reject) => {
      const done = (resp) => resolve(resp);
      const fail = (err) => reject(err);

      if (hasGM && isFunction(GM.xmlHttpRequest)) {
        const d = Object.assign({}, details);
        if (!d.onload) d.onload = done;
        if (!d.onerror) d.onerror = fail;
        try {
          GM.xmlHttpRequest(d);
        } catch (e) {
          reject(e);
        }
        return;
      }
      if (typeof GM_xmlhttpRequest === 'function') {
        const d = Object.assign({}, details);
        if (!d.onload) d.onload = done;
        if (!d.onerror) d.onerror = fail;
        try {
          GM_xmlhttpRequest(d);
        } catch (e) {
          reject(e);
        }
        return;
      }
      return reject(new Error('GM.xmlHttpRequest not available in this environment'));
    });
  }

  // --- download / saveAs ---
  function download(urlOrBlob, filename = 'download', options = {}) {
    // If manager supports GM.download / GM_download
    if (hasGM && isFunction(GM.download)) {
      try {
        return GM.download({
          url: urlOrBlob,
          name: filename,
          ...options
        });
      } catch (e) {
        return Promise.reject(e);
      }
    }
    if (typeof GM_download === 'function') {
      try {
        GM_download(urlOrBlob, filename);
        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.reject(new Error('GM.download not available in this environment'));
  }

  // convenience alias for saveAs (some engines expose GM_saveAs or GM.saveAs)
  function saveAs(blob, filename = 'file') {
    if (hasGM && isFunction(GM.saveAs)) {
      try {
        return GM.saveAs(blob, filename);
      } catch (e) {
        return Promise.reject(e);
      }
    }
    if (typeof GM_saveAs === 'function') {
      try {
        GM_saveAs(blob, filename);
        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.reject(new Error('saveAs not available in this environment'));
  }

  // --- resources: getResourceText / getResourceURL ---
  async function getResourceText(name) {
    if (hasGM && isFunction(GM.getResourceText)) return await GM.getResourceText(name);
    if (typeof GM_getResourceText === 'function') return GM_getResourceText(name);
    // fallback: if resources not declared, try to find by @resource mapping in script metadata is not accessible here.
    // Best effort: reject
    return Promise.reject(new Error('getResourceText not available in this environment'));
  }

  async function getResourceURL(name) {
    if (hasGM && isFunction(GM.getResourceURL)) return await GM.getResourceURL(name);
    if (typeof GM_getResourceURL === 'function') return GM_getResourceURL(name);
    return Promise.reject(new Error('getResourceURL not available in this environment'));
  }

  // --- clipboard ---
  function setClipboard(text) {
    if (hasGM && isFunction(GM.setClipboard)) return Promise.resolve(GM.setClipboard(text));
    if (typeof GM_setClipboard === 'function') {
      try {
        GM_setClipboard(text);
        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.reject(new Error('GM.setClipboard not available in this environment'));
  }

  // --- notifications ---
  function notification(options) {
    const opts = typeof options === 'string' ? {
      text: options
    } : (options || {});
    if (hasGM && isFunction(GM.notification)) {
      try {
        GM.notification(opts);
        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      }
    }
    if (typeof GM_notification === 'function') {
      try {
        GM_notification(opts.text || opts);
        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.reject(new Error('GM.notification not available in this environment'));
  }

  // --- addStyle ---
  function addStyle(css) {
    if (!css) return;
    if (hasGM && isFunction(GM.addStyle)) {
      try {
        GM.addStyle(css);
        return;
      } catch (e) {
        /* fallback */
      }
    }
    if (typeof GM_addStyle === 'function') {
      try {
        GM_addStyle(css);
        return;
      } catch (e) {
        /* fallback */
      }
    }
    return Promise.reject(new Error('GM.addStyle not available in this environment'));
  }

  // --- registerMenuCommand ---
  function registerMenuCommand(caption, fn, accessKey) {
    if (hasGM && isFunction(GM.registerMenuCommand)) {
      try {
        return GM.registerMenuCommand(caption, fn, accessKey);
      } catch (e) {
        /* fallback */
      }
    }
    if (typeof GM_registerMenuCommand === 'function') {
      try {
        return GM_registerMenuCommand(caption, fn, accessKey);
      } catch (e) {
        /* fallback */
      }
    }
    return null;
  }

  // --- openInTab ---
  function openInTab(url, options = {}) {
    if (hasGM && isFunction(GM.openInTab)) {
      try {
        return GM.openInTab(url, options);
      } catch (e) {
        /* fallback */
      }
    }
    if (typeof GM_openInTab === 'function') {
      try {
        return GM_openInTab(url, options);
      } catch (e) {
        /* fallback */
      }
    }
    return Promise.reject(new Error('GM.openInTab not available in this environment'));
  }

  // --- tab helpers (best-effort) ---
  async function getTab(tabId) {
    if (hasGM && GM.getTab && isFunction(GM.getTab)) return GM.getTab(tabId);
    if (typeof GM_getTab === 'function') return Promise.resolve(GM_getTab(tabId));
    return Promise.reject(new Error('getTab not supported here'));
  }

  async function saveTab(tabObj) {
    if (hasGM && GM.saveTab && isFunction(GM.saveTab)) return GM.saveTab(tabObj);
    if (typeof GM_saveTab === 'function') {
      try {
        GM_saveTab(tabObj);
        return Promise.resolve();
      } catch (e) {
        return Promise.reject(e);
      }
    }
    return Promise.reject(new Error('saveTab not supported here'));
  }

  // --- simple debugging / supported features map ---
  const __internal = {
    hasGM,
    hasLegacy,
    available: {
      getValue: hasGM ? isFunction(GM.getValue) : (typeof GM_getValue === 'function'),
      setValue: hasGM ? isFunction(GM.setValue) : (typeof GM_setValue === 'function'),
      xmlHttpRequest: hasGM ? isFunction(GM.xmlHttpRequest) : (typeof GM_xmlhttpRequest === 'function'),
      download: hasGM ? isFunction(GM.download) : (typeof GM_download === 'function'),
      notification: hasGM ? isFunction(GM.notification) : (typeof GM_notification === 'function'),
      addStyle: hasGM ? isFunction(GM.addStyle) : (typeof GM_addStyle === 'function'),
      registerMenuCommand: hasGM ? isFunction(GM.registerMenuCommand) : (typeof GM_registerMenuCommand === 'function'),
      setClipboard: hasGM ? isFunction(GM.setClipboard) : (typeof GM_setClipboard === 'function'),
      getResourceText: hasGM ? isFunction(GM.getResourceText) : (typeof GM_getResourceText === 'function'),
      getResourceURL: hasGM ? isFunction(GM.getResourceURL) : (typeof GM_getResourceURL === 'function')
    }
  };

  // --- Public API ---
  return {
    // storage
    getValue,
    setValue,
    deleteValue,
    listValues,
    // network
    xmlHttpRequest,
    // downloads/resources
    download,
    saveAs,
    getResourceText,
    getResourceURL,
    // clipboard
    setClipboard,
    // UI helpers
    notification,
    addStyle,
    registerMenuCommand,
    openInTab,
    // tabs
    getTab,
    saveTab,
    // meta
    __internal
  };
})();
