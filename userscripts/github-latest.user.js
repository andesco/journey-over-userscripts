// ==UserScript==
// @name          GitHub - Latest
// @version       1.7.0
// @description   Always keep an eye on the latest activity of your favorite projects
// @author        Journey Over
// @license       MIT
// @match         *://github.com/*
// @grant         none
// @icon          https://www.google.com/s2/favicons?sz=64&domain=github.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/github-latest.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/github-latest.user.js
// ==/UserScript==

(() => {
  const BUTTON_ID = 'latest-issues-button';
  const QUERY_STRING = 'q=sort%3Aupdated-desc';

  let debounceTimer = null;
  const debounce = (fn, delay = 150) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(fn, delay);
  };

  const getRepoNavBody = () => document.querySelector('nav.js-repo-nav > .UnderlineNav-body');

  // Find a tab to clone - prefer Issues tab, fallback to any nav item with an anchor
  const findTemplateTab = (navBody) => {
    if (!navBody) return null;

    const issuesAnchor = navBody.querySelector('a[href*="/issues"]');
    if (issuesAnchor) return issuesAnchor.closest(':scope > *') || issuesAnchor;

    for (const child of Array.from(navBody.children)) {
      if (child.querySelector && child.querySelector('a')) return child;
    }
    return null;
  };

  const addLatestIssuesButton = () => {
    const navBody = getRepoNavBody();
    if (!navBody) return;

    if (navBody.querySelector(`#${BUTTON_ID}`)) return;

    const template = findTemplateTab(navBody);
    if (!template) return;

    const newTab = createLatestIssuesTab(template);
    navBody.appendChild(newTab);
  };

  const createLatestIssuesTab = (templateTab) => {
    const clone = templateTab.cloneNode(true);
    const anchor = clone.querySelector('a') || clone;
    if (!anchor) return clone;

    anchor.id = BUTTON_ID;

    // Build href with sort query parameter
    try {
      const u = new URL(anchor.href, location.origin);
      anchor.href = `${u.pathname}${u.search ? '' : ''}?${QUERY_STRING}`;
    } catch (e) {
      const base = (anchor.href || '').split('?')[0] || '#';
      anchor.href = `${base}?${QUERY_STRING}`;
    }

    // Position tab on the right
    anchor.style.float = 'right';
    if (clone.style) clone.style.marginLeft = 'auto';

    updateIcon(clone);
    updateLabel(clone, 'Latest issues');
    removeCounter(clone);

    return clone;
  };

  // Replace icon with flame SVG
  const updateIcon = (tabElement) => {
    const svg = tabElement.querySelector('svg');
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
  };

  const updateLabel = (tabElement, text) => {
    const span = tabElement.querySelector('span');
    if (span) span.textContent = text;
  };

  const removeCounter = (tabElement) => {
    const counter = tabElement.querySelector('.Counter, .counter');
    if (counter) counter.remove();
  };

  // Watch for DOM changes to re-add button after GitHub re-renders
  const observeNavChanges = () => {
    const nav = document.querySelector('nav.js-repo-nav');
    if (!nav) return;

    const observer = new MutationObserver(() => debounce(addLatestIssuesButton));
    observer.observe(nav, { childList: true, subtree: true });
  };

  const init = () => {
    try {
      addLatestIssuesButton();
      document.addEventListener('turbo:render', () => debounce(addLatestIssuesButton));
      observeNavChanges();
      setTimeout(() => debounce(addLatestIssuesButton), 500);
    } catch (err) {
      console.warn('GitHub - Latest userscript init failed:', err);
    }
  };

  init();
})();
