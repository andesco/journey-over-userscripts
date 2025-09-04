// ==UserScript==
// @name          MyAnimeList - Add Trakt link
// @version       1.0.1
// @description   Add trakt link to MyAnimeList anime pages
// @author        Journey Over
// @license       MIT
// @match         *://myanimelist.net/anime/*
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@56863671fb980dd59047bdc683893601b816f494/libs/gm/gmcompat.js
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@56863671fb980dd59047bdc683893601b816f494/libs/utils/utils.js
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

  const logger = Logger('MAL - Add Trakt link', { debug: false });

  const malId = window.location.pathname.split('/')[2];
  if (!malId) {
    logger.warn('No MAL ID found in URL');
    return;
  }

  // Find navigation elements
  const navUl = document.querySelector('#horiznav_nav ul');
  if (!navUl) {
    logger.error('Could not find navigation list');
    return;
  }

  // Check for existing Trakt link
  if (navUl.querySelector('a[href*="trakt.tv"]')) {
    logger.debug('Trakt link already exists');
    return;
  }

  // Check cache first
  const cachedData = await GMC.getValue(malId);
  if (cachedData) {
    try {
      // Check if cache is still valid (24 hours)
      if (Date.now() - cachedData.timestamp < 24 * 60 * 60 * 1000) {
        logger.debug(`Using cached data for MAL ID ${malId}`);
        createTraktLink(cachedData.data);
        return;
      } else {
        logger.debug(`Cache expired for MAL ID ${malId}`);
      }
    } catch (err) {
      logger.error(`Error parsing cached data: ${err.message}`);
    }
  }

  // Fetch from API if no valid cache
  logger(`Fetching Trakt data for MAL ID ${malId}`);
  GMC.xmlHttpRequest({
    method: 'GET',
    url: `https://animeapi.my.id/myanimelist/${malId}`,
    onload: function(response) {
      if (response.status === 200) {
        try {
          const data = JSON.parse(response.responseText);
          if (!data.trakt || !data.trakt_type) {
            logger.warn('No Trakt data found in API response');
            return;
          }

          // Store in GMC storage with timestamp
          GMC.setValue(malId, {
            data: data,
            timestamp: Date.now()
          });

          logger(`Successfully retrieved Trakt data for MAL ID ${malId}`);
          createTraktLink(data);
        } catch (err) {
          logger.error(`Error parsing API response: ${err.message}`);
        }
      } else {
        logger.error(`API request failed with status ${response.status}`);
      }
    },
    onerror: function(error) {
      logger.error(`API request error: ${error.message}`);
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

    logger(`Added Trakt link: ${traktUrl}`);
  }
})();
