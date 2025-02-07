// ==UserScript==
// @name          External links on Trakt
// @version       2.0.1
// @description   Adds more external links to Trakt.tv pages.
// @author        Journey Over
// @license       MIT
// @match         *://trakt.tv/*
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@main/libs/utils/index.min.js?version=1.0.0
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@main/libs/wikidata/index.min.js?version=1.0.0
// @require       https://cdn.jsdelivr.net/npm/node-creation-observer@1.2.0/release/node-creation-observer-latest.min.js
// @require       https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js
// @grant         GM.deleteValue
// @grant         GM.getValue
// @grant         GM.listValues
// @grant         GM.setValue
// @grant         GM.xmlHttpRequest
// @run-at        document-start
// @inject-into   content
// @icon          https://www.google.com/s2/favicons?sz=64&domain=trakt.tv
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/external-links-on-trakt.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/external-links-on-trakt.user.js
// ==/UserScript==

/* global $, NodeCreationObserver, UserscriptUtils, Wikidata */

(() => {
  const cachePeriod = 3_600_000; // Cache duration: 1 hour
  const id = GM.info.script.name.toLowerCase().replace(/\s/g, '-');
  const CONFIG_KEY = `${id}-config`; // Key for storing script configuration
  const title = `${GM.info.script.name} Settings`;

  const defaultConfig = {
    logging: false, // Enable/disable logging
    debugging: false, // Enable/disable debugging
  };

  let scriptConfig = { ...defaultConfig };
  let UU; // UserscriptUtils instance
  let wikidata; // Wikidata instance

  // Load saved configuration
  const loadConfig = async () => {
    const savedConfig = await GM.getValue(CONFIG_KEY);
    if (savedConfig) {
      scriptConfig = { ...defaultConfig, ...savedConfig };
    }
  };

  // Save current configuration
  const saveConfig = async () => {
    await GM.setValue(CONFIG_KEY, scriptConfig);
  };

  // Add settings link to Trakt menu
  const addSettingsToMenu = () => {
    const menu = `<li class="${id}"><a href="" onclick="return !1">EL Settings</a></li>`;
    $('div.user-wrapper ul.menu li.divider').last().after(menu);
    $(`.${id}`).click(openConfigModal);
  };

  // Open configuration modal
  const openConfigModal = () => {
    const configHTML = `
      <div id="${id}-config">
        <div class="modal-content">
          <h2>${title}</h2>
          <div class="setting-item">
            <label for="logging">Enable Logging:</label>
            <label class="switch">
              <input type="checkbox" id="logging" ${scriptConfig.logging ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <label for="debugging">Enable Debugging:</label>
            <label class="switch">
              <input type="checkbox" id="debugging" ${scriptConfig.debugging ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
          <div class="buttons">
            <button id="save-config">Save and Reload</button>
            <button id="clear-cache">Clear Cache</button>
            <button id="close-config">Close</button>
          </div>
        </div>
      </div>
    `;

    $(configHTML).appendTo('body');

    // Modal styling
    $('<style>')
      .prop('type', 'text/css')
      .html(`
        #${id}-config { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background-color: rgba(0, 0, 0, 0.6); z-index: 9999; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
        .modal-content { background-color: #fff; color: #f1f1f1; border: 2px solid #4CAF50; padding: 2rem; width: 400px; max-width: 80%; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3); border-radius: 0; }
        .modal-content h2 { text-align: center; font-size: 1.5rem; margin-bottom: 1.5rem; color: #fff; }
        .setting-item { margin-bottom: 1.5rem; }
        .setting-item label { font-size: 1.1rem; margin-right: 10px; color: #fff; }
        .switch { position: relative; display: inline-block; width: 50px; height: 24px; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: 0.4s; border-radius: 34px; }
        .slider:before { position: absolute; content: ""; height: 16px; width: 16px; border-radius: 50%; left: 4px; bottom: 4px; background-color: white; transition: 0.4s; }
        input:checked + .slider { background-color: #4CAF50; }
        input:checked + .slider:before { transform: translateX(26px); }
        .buttons { display: flex; justify-content: space-between; }
        .buttons button { background-color: #4CAF50; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; transition: background-color 0.3s ease; }
        .buttons button:hover { background-color: #45a049; }
        .buttons button#close-config { background-color: #f44336; }
        .buttons button#close-config:hover { background-color: #e53935; }
      `)
      .appendTo('head');

    // Event listeners for modal buttons
    $('#save-config').click(async () => {
      scriptConfig.logging = $('#logging').is(':checked');
      scriptConfig.debugging = $('#debugging').is(':checked');
      await saveConfig();
      $(`#${id}-config`).remove();
      window.location.reload();
    });

    $('#clear-cache').click(async () => {
      await clearCache();
      $(`#${id}-config`).remove();
    });

    $('#close-config').click(() => {
      $(`#${id}-config`).remove();
    });
  };

  // Clear outdated cache entries
  const clearOldCache = async () => {
    const values = await GM.listValues();
    for (const value of values) {
      const cache = await GM.getValue(value);
      if (cache?.time && (Date.now() - cache.time) > cachePeriod) {
        GM.deleteValue(value);
      }
    }
  };

  // Clear all cache except configuration
  const clearCache = async () => {
    const values = await GM.listValues();
    for (const value of values) {
      if (value === CONFIG_KEY) continue;
      await GM.deleteValue(value);
    }
    UU.log('Cache cleared (excluding config)');
    window.location.reload();
  };

  // Extract IMDb ID from Trakt page
  const getID = () => {
    return $('#info-wrapper .sidebar .external li a#external-link-imdb').attr('href').match(/tt\d+/)?.[0];
  };

  // Determine media type (movie or TV show)
  const getType = () => {
    switch ($('meta[property="og:type"]').attr('content')) {
      case 'video.movie':
        return 'movie';
      case 'video.tv_show':
        return 'tv';
      default:
        return;
    }
  };

  // Add external links to the Trakt page
  const addLinks = (links) => {
    $.each(links, (site, link) => {
      if ($(`#info-wrapper .sidebar .external li a#external-link-${site.toLowerCase()}`).length === 0 && link !== undefined && site !== 'Trakt') {
        const externalLink = `<a target="_blank" id="external-link-${site.toLowerCase().replace(/\s/g, '_')}" href="${link.value}">${site}</a>`;
        $('#info-wrapper .sidebar .external li a:not(:has(i))').last().after(externalLink);
      }
    });

    // Add Mediux link if TMDB link is present
    const tmdbLink = $('#info-wrapper .sidebar .external li a#external-link-tmdb');
    if (tmdbLink.length > 0) {
      const tmdbHref = tmdbLink.attr('href');
      const mediuxMatch = tmdbHref.match(/\/(tv|movie)\/(\d+)/);
      if (mediuxMatch) {
        const [, type, id] = mediuxMatch;
        const mediuxType = type === 'tv' ? 'shows' : 'movies';
        const mediuxLink = `https://mediux.pro/${mediuxType}/${id}`;
        const mediuxExternalLink = `<a target="_blank" id="external-link-mediux" href="${mediuxLink}">Mediux</a>`;

        $('#info-wrapper .sidebar .external li a:not(:has(i))').last().after(mediuxExternalLink);
      }
    }
  };

  // Main initialization
  $(document).ready(async () => {
    await loadConfig();
    UU = new UserscriptUtils({
      name: GM.info.script.name,
      version: GM.info.script.version,
      author: GM.info.script.author,
      logging: scriptConfig.logging
    });
    UU.init(id);
    wikidata = new Wikidata({ debug: scriptConfig.debugging });

    // Add settings to menu when body is loaded
    NodeCreationObserver.onCreation('body', () => {
      addSettingsToMenu();
    });

    // Add external links when the external links section is loaded
    NodeCreationObserver.onCreation('.movies.show #info-wrapper .sidebar .external, .shows.show #info-wrapper .sidebar .external', async () => {
      await clearOldCache();
      const id = getID();
      if (!id) return;
      UU.log(`ID is '${id}'`);
      const type = getType();
      const cache = await GM.getValue(id);
      if (cache !== undefined && ((Date.now() - cache.time) < cachePeriod) && !scriptConfig.debugging) {
        console.log(`${id} data from cache`);
        addLinks(cache.links);
        UU.log(cache.item);
      } else {
        console.log(`${id} data from Wikidata`);
        try {
          const data = await wikidata.links(id, 'IMDb', type);
          const item = data.item;
          const links = data.links;
          await GM.setValue(id, { links, item, time: Date.now() });
          addLinks(links);
          UU.log(item);
        } catch (error) {
          UU.error(error.message);
        }
      }
    });
  });
})();
