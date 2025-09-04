// ==UserScript==
// @name          Nexus Mod - Updated Mod Highlighter
// @version       1.0.1
// @description   Highlight mods that have updated since you last downloaded them
// @author        Journey Over
// @license       MIT
// @match         *://www.nexusmods.com/users/myaccount?tab=download+history
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@56863671fb980dd59047bdc683893601b816f494/libs/utils/utils.js
// @grant         none
// @icon          https://www.google.com/s2/favicons?sz=64&domain=nexusmods.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/nexusmods-updated-mod-highlighter.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/nexusmods-updated-mod-highlighter.user.js
// ==/UserScript==

(function() {
  'use strict';

  const logger = Logger('Nexus Mod - Updated Mod Highlighter', { debug: false });

  // Configuration
  const HIGHLIGHT_CLASS = 'nexus-updated-mod-highlight';
  const HIGHLIGHT_COLOR = 'rgba(68,68,0,0.9)';
  const POLL_INTERVAL = 250; // ms
  const MAX_WAIT_MS = 15_000; // stop waiting after this many ms

  function addStyles() {
    if (document.getElementById('nexus-updated-style')) return;
    const style = document.createElement('style');
    style.id = 'nexus-updated-style';
    style.textContent = `.${HIGHLIGHT_CLASS} td { background-color: ${HIGHLIGHT_COLOR} !important; }`;
    document.head.appendChild(style);
    logger.debug('Inserted highlight style:', HIGHLIGHT_COLOR);
  }

  function parseDate(text) {
    if (!text) return NaN;
    const s = text.replace(/\s+/g, ' ').trim();
    const t = Date.parse(s);
    if (!isNaN(t)) return t;
    try { return new Date(s).getTime(); } catch (e) { return NaN; }
  }

  function processRows(rows) {
    // rows can be a NodeList, array, or jQuery collection
    let collection;
    if (window.jQuery && rows instanceof window.jQuery) collection = rows.toArray();
    else if (NodeList.prototype.isPrototypeOf(rows) || Array.isArray(rows)) collection = Array.from(rows);
    else collection = [rows];

    let processed = 0;
    let highlighted = 0;
    collection.forEach(tr => {
      if (!tr || tr.nodeType !== 1) return;
      const dlCell = tr.querySelector && tr.querySelector('td.table-download');
      const upCell = tr.querySelector && tr.querySelector('td.table-update');
      if (!dlCell || !upCell) return;
      const dateDl = parseDate(dlCell.textContent);
      const dateUp = parseDate(upCell.textContent);
      processed++;
      if (!isNaN(dateDl) && !isNaN(dateUp) && dateDl < dateUp) {
        tr.classList.add(HIGHLIGHT_CLASS);
        highlighted++;
      }
    });
    logger.debug(`Processed rows: ${processed}, highlighted: ${highlighted}`);
  }

  function waitForRows(callback) {
    const started = Date.now();
    logger.debug('Waiting for rows (polling)...');

    function check() {
      const loading = document.querySelector('p.history_loading');
      const rows = document.querySelectorAll('tr.even, tr.odd');
      const loadingHidden = !loading || getComputedStyle(loading).display === 'none';
      if (loadingHidden && rows.length > 0) {
        logger('Rows detected, invoking callback. Count:', rows.length);
        callback(rows);
        return;
      }
      if (Date.now() - started > MAX_WAIT_MS) {
        // give up waiting and process whatever is present
        logger('Timed out waiting for rows after', Date.now() - started, 'ms. Processing', rows.length, 'rows');
        callback(rows);
        return;
      }
      setTimeout(check, POLL_INTERVAL);
    }
    check();

    // Also observe for dynamic changes and re-run processing when new rows appear
    const table = document.querySelector('table');
    if (table) {
      logger.debug('Attaching MutationObserver to table for dynamic updates');
      const mo = new MutationObserver(() => {
        // simple debounce: process after observing
        const rows = document.querySelectorAll('tr.even, tr.odd');
        if (rows.length > 0) {
          logger.debug('MutationObserver saw changes — processing rows. Count:', rows.length);
          try { processRows(rows); } catch (err) { logger.error('MutationObserver processing error', err); }
        }
      });
      mo.observe(table, { childList: true, subtree: true });
    }
  }

  function init() {
    logger('Initializing Nexus Mod Updated Mod Highlighter');
    addStyles();
    waitForRows(rows => {
      try {
        if (window.jQuery) {
          logger.debug('Processing rows using jQuery wrapper');
          processRows(window.jQuery(rows));
        } else {
          logger.debug('Processing rows using native DOM collection');
          processRows(rows);
        }
      } catch (err) {
        logger.error('Error processing rows', err);
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();
