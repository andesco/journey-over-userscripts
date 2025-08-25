// ==UserScript==
// @author       Journey Over
// @exclude      *
// ==UserLibrary==
// @name         @journeyover/gmcompat
// @description  GM Compatibility Layer
// @license      MIT
// @version      1.0.0
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
// @grant        GM.info
// @grant        GM.download
// @grant        GM.getResourceText
// @grant        GM.getResourceURL
// @grant        GM.setClipboard
// @grant        GM.cookie
// @grant        GM.getTab
// @grant        GM.saveAs
// ==/UserScript==

const GMCompatExtended = (function () {
  const hasGM = typeof GM !== 'undefined' && GM !== null;
  const hasLegacy = typeof GM_getValue !== 'undefined' || typeof GM_setValue !== 'undefined';
  const LS_PREFIX = '__gmcompat__::';

  // --- Helpers ---
  const isFunction = (v) => typeof v === 'function';
  const tryCall = (fn, ...args) => {
    try { return fn(...args); } catch (e) { throw e; }
  };

  // --- Storage (Promise-based) ---
  async function getValue(key, defaultValue = undefined) {
    if (hasGM && isFunction(GM.getValue)) return await GM.getValue(key, defaultValue);
    if (typeof GM_getValue === 'function') {
      const v = GM_getValue(key);
      return v === undefined ? defaultValue : v;
    }
    const raw = localStorage.getItem(LS_PREFIX + key);
    return raw == null ? defaultValue : JSON.parse(raw);
  }

  function setValue(key, value) {
    if (hasGM && isFunction(GM.setValue)) return GM.setValue(key, value);
    if (typeof GM_setValue === 'function') {
      try {
        GM_setValue(key, value);
        return Promise.resolve();
      } catch (e) { return Promise.reject(e); }
    }
    try {
      localStorage.setItem(LS_PREFIX + key, JSON.stringify(value));
      return Promise.resolve();
    } catch (e) { return Promise.reject(e); }
  }

  function deleteValue(key) {
    if (hasGM && isFunction(GM.deleteValue)) return GM.deleteValue(key);
    if (typeof GM_deleteValue === 'function') {
      try { GM_deleteValue(key); return Promise.resolve(); } catch (e) { return Promise.reject(e); }
    }
    localStorage.removeItem(LS_PREFIX + key);
    return Promise.resolve();
  }

  function listValues() {
    if (hasGM && isFunction(GM.listValues)) return GM.listValues();
    if (typeof GM_listValues === 'function') {
      try { return Promise.resolve(GM_listValues()); } catch (e) { return Promise.reject(e); }
    }
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(LS_PREFIX)) keys.push(k.slice(LS_PREFIX.length));
    }
    return Promise.resolve(keys);
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
        try { GM.xmlHttpRequest(d); } catch (e) { reject(e); }
        return;
      }
      if (typeof GM_xmlhttpRequest === 'function') {
        const d = Object.assign({}, details);
        if (!d.onload) d.onload = done;
        if (!d.onerror) d.onerror = fail;
        try { GM_xmlhttpRequest(d); } catch (e) { reject(e); }
        return;
      }

      // fallback: fetch (best-effort)
      (async () => {
        try {
          if (!details.url) throw new Error('xmlHttpRequest fallback requires details.url');
          const method = (details.method || 'GET').toUpperCase();
          const headers = details.headers || {};
          const init = {
            method,
            headers,
            body: details.data ?? details.body ?? undefined,
            credentials: details.credentials || 'same-origin',
            redirect: 'follow'
          };
          const res = await fetch(details.url, init);
          const contentType = res.headers.get('content-type') || '';
          const responseText = await res.text();
          resolve({
            status: res.status,
            statusText: res.statusText,
            responseText,
            finalUrl: res.url,
            readyState: 4,
            responseHeaders: res.headers,
            response: (contentType.includes('application/json') ? JSON.parse(responseText || '{}') : undefined)
          });
        } catch (err) { reject(err); }
      })();
    });
  }

  // --- download / saveAs ---
  function download(urlOrBlob, filename = 'download', options = {}) {
    // If manager supports GM.download / GM_download
    if (hasGM && isFunction(GM.download)) {
      try { return GM.download({ url: urlOrBlob, name: filename, ...options }); } catch (e) { return Promise.reject(e); }
    }
    if (typeof GM_download === 'function') {
      try { GM_download(urlOrBlob, filename); return Promise.resolve(); } catch (e) { return Promise.reject(e); }
    }

    // fallback: create an <a download> (works for same-origin or blob/data urls)
    return new Promise((resolve, reject) => {
      try {
        if (urlOrBlob instanceof Blob) {
          const u = URL.createObjectURL(urlOrBlob);
          const a = document.createElement('a');
          a.href = u;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(u), 1000);
          resolve();
          return;
        }
        const a = document.createElement('a');
        a.href = urlOrBlob;
        a.download = filename;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        a.remove();
        resolve();
      } catch (e) { reject(e); }
    });
  }

  // convenience alias for saveAs (some engines expose GM_saveAs or GM.saveAs)
  function saveAs(blob, filename = 'file') {
    if (hasGM && isFunction(GM.saveAs)) {
      try { return GM.saveAs(blob, filename); } catch (e) { return Promise.reject(e); }
    }
    if (typeof GM_saveAs === 'function') {
      try { GM_saveAs(blob, filename); return Promise.resolve(); } catch (e) { return Promise.reject(e); }
    }
    return download(blob, filename);
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
      try { GM_setClipboard(text); return Promise.resolve(); } catch (e) { return Promise.reject(e); }
    }
    // fallback: navigator.clipboard
    if (navigator.clipboard && isFunction(navigator.clipboard.writeText)) {
      return navigator.clipboard.writeText(String(text));
    }
    // fallback older approach
    return new Promise((resolve, reject) => {
      try {
        const ta = document.createElement('textarea');
        ta.value = String(text);
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (ok) resolve(); else reject(new Error('copy failed'));
      } catch (e) { reject(e); }
    });
  }

  // --- cookies (best-effort) ---
  // Many userscript managers provide GM.cookie or GM.cookies; otherwise fallback to document.cookie (limited)
  const cookie = {
    async get(name) {
      // try modern GM.cookie API (not widely standardized)
      if (hasGM && GM.cookie && isFunction(GM.cookie.get)) {
        return GM.cookie.get(name);
      }
      if (typeof GM_getCookie === 'function') {
        try { return GM_getCookie(name); } catch (e) { /* continue */ }
      }
      // fallback parse document.cookie (only client-side accessible cookies)
      const match = document.cookie.split('; ').find(row => row.startsWith(name + '='));
      return match ? decodeURIComponent(match.split('=')[1]) : null;
    },
    async set(name, value, opts = {}) {
      if (hasGM && GM.cookie && isFunction(GM.cookie.set)) {
        return GM.cookie.set(name, value, opts);
      }
      if (typeof GM_setCookie === 'function') {
        try { GM_setCookie(name, value, opts); return Promise.resolve(); } catch (e) { return Promise.reject(e); }
      }
      // fallback document.cookie (note: cannot set HttpOnly, Secure cross-site)
      let s = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
      if (opts.expires) {
        if (typeof opts.expires === 'number') {
          const d = new Date(Date.now() + opts.expires * 1000);
          s += `; expires=${d.toUTCString()}`;
        } else if (opts.expires instanceof Date) {
          s += `; expires=${opts.expires.toUTCString()}`;
        } else {
          s += `; expires=${opts.expires}`;
        }
      }
      if (opts.path) s += `; path=${opts.path}`;
      if (opts.domain) s += `; domain=${opts.domain}`;
      if (opts.secure) s += '; secure';
      document.cookie = s;
      return Promise.resolve();
    },
    async delete(name, opts = {}) {
      // set expiry in the past
      return cookie.set(name, '', { ...opts, expires: new Date(0) });
    }
  };

  // --- notifications ---
  function notification(options) {
    const opts = typeof options === 'string' ? { text: options } : (options || {});
    if (hasGM && isFunction(GM.notification)) {
      try { GM.notification(opts); return Promise.resolve(); } catch (e) { return Promise.reject(e); }
    }
    if (typeof GM_notification === 'function') {
      try { GM_notification(opts.text || opts); return Promise.resolve(); } catch (e) { return Promise.reject(e); }
    }

    return new Promise((resolve, reject) => {
      if (typeof Notification === 'undefined') return reject(new Error('No Notification API available'));
      function spawn() {
        try {
          const n = new Notification(opts.title || '', { body: opts.text || '', ...opts });
          if (isFunction(opts.onclick)) n.onclick = opts.onclick;
          if (opts.timeout) setTimeout(() => n.close(), opts.timeout);
          resolve(n);
        } catch (e) { reject(e); }
      }
      if (Notification.permission === 'granted') spawn();
      else Notification.requestPermission().then(p => (p === 'granted' ? spawn() : reject(new Error('Notification permission denied'))));
    });
  }

  // --- addStyle ---
  function addStyle(css) {
    if (!css) return;
    if (hasGM && isFunction(GM.addStyle)) {
      try { GM.addStyle(css); return; } catch (e) { /* fallback */ }
    }
    if (typeof GM_addStyle === 'function') {
      try { GM_addStyle(css); return; } catch (e) { /* fallback */ }
    }
    const s = document.createElement('style');
    s.textContent = css;
    (document.head || document.documentElement).appendChild(s);
  }

  // --- registerMenuCommand ---
  function registerMenuCommand(caption, fn, accessKey) {
    if (hasGM && isFunction(GM.registerMenuCommand)) {
      try { return GM.registerMenuCommand(caption, fn, accessKey); } catch (e) { /* fallback */ }
    }
    if (typeof GM_registerMenuCommand === 'function') {
      try { return GM_registerMenuCommand(caption, fn, accessKey); } catch (e) { /* fallback */ }
    }
    // fallback: small button
    try {
      const btn = document.createElement('button');
      btn.textContent = caption;
      btn.style.position = 'fixed';
      btn.style.top = '8px';
      btn.style.right = (document.querySelectorAll('.gmcompat-btn').length * 80 + 8) + 'px';
      btn.style.zIndex = 999999;
      btn.className = 'gmcompat-btn';
      btn.addEventListener('click', fn);
      document.body.appendChild(btn);
      return btn;
    } catch (e) {
      return null;
    }
  }

  // --- openInTab ---
  function openInTab(url, options = {}) {
    if (hasGM && isFunction(GM.openInTab)) {
      try { return GM.openInTab(url, options); } catch (e) { /* fallback */ }
    }
    if (typeof GM_openInTab === 'function') {
      try { return GM_openInTab(url, options); } catch (e) { /* fallback */ }
    }
    // fallback: open window/tab
    return new Promise((resolve) => {
      const w = window.open(url, '_blank');
      if (w && options.active !== false) w.focus();
      resolve(w);
    });
  }

  // --- info ---
  function info() {
    if (hasGM && typeof GM.info !== 'undefined') return GM.info;
    if (typeof GM_info !== 'undefined') return GM_info;
    return { scriptHandler: 'GMCompat-Fallback', version: '0.0.0' };
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
      try { GM_saveTab(tabObj); return Promise.resolve(); } catch (e) { return Promise.reject(e); }
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
      getResourceURL: hasGM ? isFunction(GM.getResourceURL) : (typeof GM_getResourceURL === 'function'),
      cookieAPI: hasGM ? !!GM.cookie : (typeof GM_getCookie === 'function')
    }
  };

  // --- Public API ---
  return {
    // storage
    getValue, setValue, deleteValue, listValues,
    // network
    xmlHttpRequest,
    // downloads/resources
    download, saveAs, getResourceText, getResourceURL,
    // clipboard & cookies
    setClipboard, cookie,
    // UI helpers
    notification, addStyle, registerMenuCommand, openInTab,
    // info & tabs
    info, getTab, saveTab,
    // meta
    __internal
  };
})();
