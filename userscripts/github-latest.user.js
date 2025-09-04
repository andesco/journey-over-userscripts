// ==UserScript==
// @name          GitHub - Latest
// @version       1.8.0
// @description   Always keep an eye on the latest activity of your favorite projects
// @author        Journey Over
// @license       MIT
// @match         *://github.com/*
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@c185c2777d00a6826a8bf3c43bbcdcfeba5a9566/libs/utils/utils.min.js
// @grant         none
// @icon          https://www.google.com/s2/favicons?sz=64&domain=github.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/github-latest.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/github-latest.user.js
// ==/UserScript==

(async function() {
  'use strict';

  const logger = Logger('GH - Latest', { debug: false });
  const BUTTON_ID = 'latest-issues-button';
  const QUERY_STRING = 'q=sort%3Aupdated-desc';

  // Find a suitable tab to use as a template for cloning (preferably Issues tab)
  const findTemplateTab = (navBody) => {
    const issuesAnchor = navBody.querySelector('a[href*="/issues"]');
    if (issuesAnchor) {
      logger.debug('Issues tab found as template');
      return issuesAnchor.closest(':scope > *') || issuesAnchor;
    }

    // Fallback: pick the first child containing an anchor
    const fallback = Array.from(navBody.children).find(child => child.querySelector && child.querySelector('a'));
    if (fallback) logger.debug('Fallback tab found as template');
    return fallback || null;
  };

  // Clone a tab template and customize it as "Latest issues" tab
  const createLatestIssuesTab = (templateTab) => {
    const clone = templateTab.cloneNode(true);
    const anchor = clone.querySelector('a') || clone;

    if (!anchor) {
      logger.warn('Template tab has no anchor');
      return clone;
    }

    anchor.id = BUTTON_ID;

    // Safely set the href to include the "latest issues" query
    try {
      const url = new URL(anchor.href, location.origin);
      anchor.href = `${url.pathname}?${QUERY_STRING}`;
    } catch {
      anchor.href = `${(anchor.href || '#').split('?')[0]}?${QUERY_STRING}`;
      logger.warn('Fallback href applied for Latest issues tab');
    }

    anchor.style.float = 'right';
    if (clone.style) clone.style.marginLeft = 'auto';

    const svg = clone.querySelector('svg');
    if (svg) {
      svg.setAttribute('viewBox', '0 0 16 16');
      svg.style.margin = '0 4px';
      svg.innerHTML = `<path fill-rule="evenodd" d="M5.05 0.31c0.81 2.17 0.41 3.38-0.52 4.31-0.98 1.05-2.55 1.83-3.63 3.36
      -1.45 2.05-1.7 6.53 3.53 7.7-2.2-1.16-2.67-4.52-0.3-6.61-0.61 2.03 0.53 3.33 1.94 2.86
      1.39-0.47 2.3 0.53 2.27 1.67-0.02 0.78-0.31 1.44-1.13 1.81 3.42-0.59 4.78-3.42
      4.78-5.56 0-2.84-2.53-3.22-1.25-5.61-1.52 0.13-2.03 1.13-1.89 2.75 0.09 1.08-1.02
      1.8-1.86 1.33-0.67-0.41-0.66-1.19-0.06-1.78 1.25-1.23 1.75-4.09-1.88-6.22l-0.02-0.02z"/>`;
    }

    const span = clone.querySelector('span');
    if (span) span.textContent = 'Latest issues';

    const counter = clone.querySelector('.Counter, .counter');
    if (counter) counter.remove();

    return clone;
  };

  // Insert the "Latest issues" tab into the nav
  const addLatestIssuesButton = async () => {
    const NAV_SELECTOR = 'nav.js-repo-nav > .UnderlineNav-body';

    try {
      const tryAdd = (navBody) => {
        if (!navBody) return false;

        // Avoid duplicates
        if (navBody.querySelector(`#${BUTTON_ID}`)) {
          logger.debug('Latest issues button already exists');
          return true;
        }

        const template = findTemplateTab(navBody);
        if (!template) {
          logger.warn('No suitable template tab found');
          return false;
        }

        navBody.appendChild(createLatestIssuesTab(template));
        logger('Latest issues button added');
        return true;
      };

      // Initial attempt
      const navBody = document.querySelector(NAV_SELECTOR);
      if (tryAdd(navBody)) return;

      // If nav isn't present yet (SPA load), observe DOM until it appears
      const observer = new MutationObserver((_, obs) => {
        const navBody = document.querySelector(NAV_SELECTOR);
        if (tryAdd(navBody)) {
          obs.disconnect();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } catch (err) {
      logger.error('Failed to add Latest issues button:', err);
    }
  };

  // Debounced wrapper to prevent excessive DOM updates
  const debouncedAddButton = debounce(addLatestIssuesButton, 200);

  // Initial call and SPA navigation handling
  const init = () => {
    debouncedAddButton();
    document.addEventListener('turbo:render', () => {
      logger.debug('turbo:render detected, updating Latest issues tab');
      debouncedAddButton();
    });
  };

  init();
})();
