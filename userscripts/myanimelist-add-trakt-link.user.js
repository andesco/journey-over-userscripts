// ==UserScript==
// @name          MyAnimeList - Add Trakt link
// @version       1.0.1
// @description   Add trakt link to MyAnimeList anime pages
// @author        Journey Over
// @license       MIT
// @match         *://myanimelist.net/anime/*
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@5f2cbff53b0158ca07c86917994df0ed349eb96c/libs/gm/gmcompat.js
// @grant         GM.xmlHttpRequest
// @grant         GM.setValue
// @grant         GM.getValue
// @run-at        document-end
// @inject-into   content
// @icon          https://www.google.com/s2/favicons?sz=64&domain=myanimelist.net
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/myanimelist-add-trakt-link.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/myanimelist-add-trakt-link.user.js
// ==/UserScript==

(async function() {
  'use strict';

  // Logging function
  function log(message, level = 'info') {
    const prefix = `[MAL-Trakt]`;
    switch (level) {
      case 'error':
        console.error(`${prefix} ERROR: ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} WARNING: ${message}`);
        break;
      case 'debug':
        console.debug(`${prefix} DEBUG: ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }

  const malId = window.location.pathname.split('/')[2];
  if (!malId) {
    log('No MAL ID found in URL', 'warn');
    return;
  }

  // Find navigation elements
  const navUl = document.querySelector('#horiznav_nav ul');
  if (!navUl) {
    log('Could not find navigation list', 'error');
    return;
  }

  // Check for existing Trakt link
  if (navUl.querySelector('a[href*="trakt.tv"]')) {
    log('Trakt link already exists', 'debug');
    return;
  }

  // Check cache first
  const cachedData = await GMC.getValue(malId);
  if (cachedData) {
    try {
      // Check if cache is still valid (24 hours)
      if (Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000) {
        log(`Using cached data for MAL ID ${malId}`, 'debug');
        createTraktLink(cachedData.data);
        return;
      } else {
        log(`Cache expired for MAL ID ${malId}`, 'debug');
      }
    } catch (e) {
      log(`Error parsing cached data: ${e.message}`, 'error');
    }
  }

  // Fetch from API if no valid cache
  log(`Fetching Trakt data for MAL ID ${malId}`, 'info');
  GMC.xmlHttpRequest({
    method: 'GET',
    url: `https://animeapi.my.id/myanimelist/${malId}`,
    onload: function(response) {
      if (response.status === 200) {
        try {
          const data = JSON.parse(response.responseText);
          if (!data.trakt || !data.trakt_type) {
            log('No Trakt data found in API response', 'warn');
            return;
          }

          // Store in GMC storage with timestamp
          GMC.setValue(malId, {
            data: data,
            timestamp: Date.now()
          });

          log(`Successfully retrieved Trakt data for MAL ID ${malId}`, 'info');
          createTraktLink(data);
        } catch (e) {
          log(`Error parsing API response: ${e.message}`, 'error');
        }
      } else {
        log(`API request failed with status ${response.status}`, 'error');
      }
    },
    onerror: function(error) {
      log(`API request error: ${error.message}`, 'error');
    }
  });

  function createTraktLink(data) {
    // Create Trakt URL
    const traktUrl = `https://trakt.tv/${data.trakt_type}/${data.trakt}`;

    // Create list item matching MAL's style
    const listItem = document.createElement('li');
    const link = document.createElement('a');

    // Styling to match MAL's navigation links
    link.href = traktUrl;
    link.textContent = 'Trakt';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'horiznav_link';
    link.style.cssText = `
          color: inherit;
          text-decoration: none;
          transition: color 0.2s ease;
      `;

    // Hover effect
    link.addEventListener('mouseover', () => {
      link.style.color = '#2e51a2';
      link.style.textDecoration = 'none';
    });
    link.addEventListener('mouseout', () => {
      link.style.color = 'inherit';
    });

    // Append as the last item in the navigation list
    navUl.appendChild(listItem);
    listItem.appendChild(link);

    log(`Added Trakt link: ${traktUrl}`, 'info');
  }
})();
