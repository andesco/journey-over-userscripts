// ==UserScript==
// @name          GitHub - Latest
// @version       1.7.1
// @description   Always keep an eye on the latest activity of your favorite projects
// @author        Journey Over
// @license       MIT
// @match         *://github.com/*
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@242f9a1408e4bb2271189a2b2d1e69ffb031fa51/libs/utils/utils.js
// @grant         none
// @icon          https://www.google.com/s2/favicons?sz=64&domain=github.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/github-latest.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/github-latest.user.js
// ==/UserScript==

(function() {
  'use strict';

  const logger = Logger('GH - Latest', { debug: false });
  const BUTTON_ID = 'latest-issues-button';
  const QUERY_STRING = 'q=sort%3Aupdated-desc';

  // Retrieve the main navigation container in a repository page
  const getRepoNavBody = () => {
    const navBody = document.querySelector('nav.js-repo-nav > .UnderlineNav-body');
    if (!navBody) logger.debug('Repo nav body not found');
    return navBody;
  };

  // Find a suitable tab to use as a template for cloning (preferably Issues tab)
  const findTemplateTab = (navBody) => {
    if (!navBody) return null;

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
      logger.debug('Anchor href set to:', anchor.href);
    } catch {
      const base = (anchor.href || '').split('?')[0] || '#';
      anchor.href = `${base}?${QUERY_STRING}`;
      logger.warn('Failed to parse anchor href, fallback applied:', anchor.href);
    }

    // Align the tab to the right
    anchor.style.float = 'right';
    if (clone.style) clone.style.marginLeft = 'auto';

    updateIcon(clone); // Replace default icon with a flame icon
    updateLabel(clone, 'Latest issues'); // Update the label
    removeCounter(clone); // Remove any counter badges

    return clone;
  };

  // Update the tab icon to a flame SVG
  const updateIcon = (tab) => {
    const svg = tab.querySelector('svg');
    if (!svg) return;

    svg.setAttribute('viewBox', '0 0 16 16');
    svg.style.margin = '0 4px';
    svg.innerHTML = `
      <path fill-rule="evenodd" d="M5.05 0.31c0.81 2.17 0.41 3.38-0.52 4.31-0.98 1.05-2.55 1.83-3.63 3.36
      -1.45 2.05-1.7 6.53 3.53 7.7-2.2-1.16-2.67-4.52-0.3-6.61-0.61 2.03 0.53 3.33 1.94 2.86
      1.39-0.47 2.3 0.53 2.27 1.67-0.02 0.78-0.31 1.44-1.13 1.81 3.42-0.59 4.78-3.42
      4.78-5.56 0-2.84-2.53-3.22-1.25-5.61-1.52 0.13-2.03 1.13-1.89 2.75 0.09 1.08-1.02
      1.8-1.86 1.33-0.67-0.41-0.66-1.19-0.06-1.78 1.25-1.23 1.75-4.09-1.88-6.22l-0.02-0.02z"/>
    `;
    logger.debug('Icon updated to flame SVG');
  };

  // Set the tab label text
  const updateLabel = (tab, text) => {
    const span = tab.querySelector('span');
    if (span) {
      span.textContent = text;
      logger.debug('Tab label updated to:', text);
    }
  };

  // Remove any counter badge from the tab
  const removeCounter = (tab) => {
    const counter = tab.querySelector('.Counter, .counter');
    if (counter) {
      counter.remove();
      logger.debug('Counter removed from tab');
    }
  };

  // Add the "Latest issues" tab to the repository nav
  const addLatestIssuesButton = () => {
    const navBody = getRepoNavBody();
    if (!navBody) return;

    if (navBody.querySelector(`#${BUTTON_ID}`)) {
      logger.debug('Latest issues button already exists');
      return;
    }

    const template = findTemplateTab(navBody);
    if (!template) {
      logger.warn('No template tab found, cannot add latest issues button');
      return;
    }

    navBody.appendChild(createLatestIssuesTab(template));
    logger('Latest issues button added');
  };

  // Debounced wrapper to prevent excessive DOM updates
  const debouncedAddButton = debounce(addLatestIssuesButton, 150);

  // Observe changes in the repository nav to re-add the button if needed
  const observeNavChanges = () => {
    const nav = document.querySelector('nav.js-repo-nav');
    if (!nav) {
      logger.warn('Nav element not found for MutationObserver');
      return;
    }

    const observer = new MutationObserver(() => {
      logger.debug('Nav mutation detected, re-adding button');
      debouncedAddButton();
    });

    observer.observe(nav, { childList: true, subtree: true });
    logger.debug('MutationObserver attached to nav');
  };

  // Initialize the script
  const init = () => {
    try {
      addLatestIssuesButton();

      // Re-add button on SPA navigation events
      document.addEventListener('turbo:render', () => {
        logger.debug('turbo:render event triggered');
        debouncedAddButton();
      });

      observeNavChanges();

      // Ensure button is added after initial delay for dynamically loaded content
      setTimeout(() => {
        logger.debug('Initial delayed addLatestIssuesButton call');
        debouncedAddButton();
      }, 500);
    } catch (err) {
      logger.error('Init Failed:', err);
    }
  };

  init();
})();
