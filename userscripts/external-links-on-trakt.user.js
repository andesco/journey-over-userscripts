// ==UserScript==
// @name          External links on Trakt
// @version       1.0.0
// @description   Add more external links on Trakt
// @author        Journey Over
// @license       MIT
// @match         *://trakt.tv/*
// @require       https://cdn.jsdelivr.net/gh/sizzlemctwizzle/GM_config@43fd0fe4de1166f343883511e53546e87840aeaf/gm_config.min.js
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@main/libs/utils/index.min.js?version=1.0.0
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@main/libs/wikidata/index.min.js?version=1.0.0
// @require       https://cdn.jsdelivr.net/npm/node-creation-observer@1.2.0/release/node-creation-observer-latest.min.js
// @require       https://cdn.jsdelivr.net/npm/jquery@3.6.0/dist/jquery.min.js
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM.deleteValue
// @grant         GM.getValue
// @grant         GM.listValues
// @grant         GM.registerMenuCommand
// @grant         GM.setValue
// @grant         GM.xmlHttpRequest
// @run-at        document-start
// @inject-into   content
// @icon          https://www.google.com/s2/favicons?sz=64&domain=trakt.tv
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/external-links-on-trakt.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/external-links-on-trakt.user.js
// ==/UserScript==

/* global $, GM_config, NodeCreationObserver, UserscriptUtils, Wikidata */

(() => {
  // Constants
  const cachePeriod = 3_600_000;
  const id = GM.info.script.name.toLowerCase().replace(/\s/g, '-');
  const title = `${GM.info.script.name} Settings`;

  // GM_config fields
  const fields = {
    logging: {
      label: 'Logging',
      section: ['Develop'],
      labelPos: 'left',
      type: 'checkbox',
      default: false
    },
    debugging: {
      label: 'Debugging',
      labelPos: 'left',
      type: 'checkbox',
      default: false
    },
    clearCache: {
      label: 'Clear the cache',
      type: 'button',
      click: async () => {
        const values = await GM.listValues();
        for (const value of values) {
          const cache = await GM.getValue(value); // get cache
          if (cache.time) {
            GM.deleteValue(value); // delete cache
          }
        }
        UU.log('Cache cleared');
        GM_config.close();
      }
    }
  };

  // Initialize GM_config
  GM_config.init({
    id,
    title,
    fields,
    css: ':root{--font:"Montserrat",sans-serif;--background-grey:rgb(29, 29, 29);--black:rgb(0, 0, 0);--dark-grey:rgb(22, 22, 22);--grey:rgb(51, 51, 51);--red:rgb(237, 34, 36);--white:rgb(255, 255, 255)}#external-links-on-trakt *{color:var(--white)!important;font-family:var(--font)!important;font-size:14px!important;font-weight:400!important}#external-links-on-trakt{background:var(--background-grey)!important}#external-links-on-trakt .config_header{font-size:34px!important;line-height:1.1!important;text-shadow:0 0 20px var(--black)!important}#external-links-on-trakt .section_header_holder{background:var(--dark-grey)!important;border:1px solid var(--grey)!important;margin-bottom:1em!important}#external-links-on-trakt .section_header{background:var(--grey)!important;border:1px solid var(--grey)!important;padding:8px!important;text-align:left!important;text-transform:uppercase!important}#external-links-on-trakt .config_var{align-items:center!important;display:flex!important;margin:0!important;padding:15px!important}#external-links-on-trakt .field_label{margin-left:6px!important}#external-links-on-trakt button,#external-links-on-trakt input[type=button]{background:var(--grey)!important;border:1px solid transparent!important;padding:10px 16px!important}#external-links-on-trakt button:hover,#external-links-on-trakt input[type=button]:hover{filter:brightness(85%)!important}#external-links-on-trakt_buttons_holder button{background-color:var(--red)!important}#external-links-on-trakt .reset{margin-right:10px!important}',
    events: {
      init: () => {
        window.addEventListener('load', () => { // Add Google Fonts
          $('head').append('<style>@import url(https://fonts.googleapis.com/css2?family=Montserrat&display=swap);header#top-nav .navbar-nav.navbar-user:hover #user-menu{max-height:max-content}</style>');
        });
        if (GM.info.scriptHandler !== 'Userscripts') { // Add menu command
          GM.registerMenuCommand('Configure', () => GM_config.open());
        }
      },
      save: () => {
        window.alert(`${GM.info.script.name}: settings saved`);
        GM_config.close();
        window.location.reload(false);
      }
    }
  });

  // Initialize NodeCreationObserver
  NodeCreationObserver.init(id);

  // Initialize UserscriptUtils
  const UU = new UserscriptUtils({
    name: GM.info.script.name,
    version: GM.info.script.version,
    author: GM.info.script.author,
    logging: GM_config.get('logging')
  });
  UU.init(id);

  // Initialize Wikidata
  const wikidata = new Wikidata({
    debug: GM_config.get('debugging')
  });

  // Functions
  /**
  * Adds a link to the menu to access the script configuration
  **/
  const addSettingsToMenu = () => {
    const menu = `<li class=${id}><a href="" onclick="return !1">EL Settings</a>`;
    $('div.user-wrapper ul.menu li.divider').last().after(menu);
    $(`.${id}`).click(() => GM_config.open());
  };

  /**
  * Clear old data from the cache
  **/
  const clearOldCache = async () => {
    const values = await GM.listValues();
    for (const value of values) {
      const cache = await GM.getValue(value); // get cache
      if ((Date.now() - cache.time) > cachePeriod) {
        GM.deleteValue(value); // delete cache
      }
    }
  };

  /**
  * Returns IMDb ID
  *
  * @returns {string} IMDb ID
  **/
  const getID = () => {
    return $('#info-wrapper .sidebar .external li a#external-link-imdb').attr('href').match(/tt\d+/)?.[0];
  };

  /**
  * Returns item type
  *
  * @returns {string} Item type
  **/
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

  /**
  * Add external links
  *
  * @param {object} links Links data
  **/
  const addLinks = (links) => {
    $.each(links, (site, link) => {
      if ($(`#info-wrapper .sidebar .external li a#external-link-${site.toLowerCase()}`).length === 0 && link !== undefined && site !== 'Trakt') {
        const externalLink = `<a target="_blank" id="external-link-${site.toLowerCase().replace(/\s/g, '_')}" href="${link.value}" data-original-title="" title="">${site}</a>`;
        $('#info-wrapper .sidebar .external li a:not(:has(i))').last().after(externalLink); // Desktop
        $('#info-wrapper .info .additional-stats li:last-child a:not([data-site]):not([data-method]):not([data-id])').last().after(externalLink).after(', '); // Mobile
      }
    });
  };

  // Script Execution
  $(document).ready(() => {
    NodeCreationObserver.onCreation('body', () => {
      addSettingsToMenu(); // Add settings to menu
    });
    NodeCreationObserver.onCreation('.movies.show #info-wrapper .sidebar .external, .shows.show #info-wrapper .sidebar .external', async () => {
      await clearOldCache(); // Clear old data from the cache
      const id = getID(); // Get IMDb ID
      if (!id) return; // Exit if IMDb ID is not found
      UU.log(`ID is '${id}'`);
      const type = getType(); // Get item type
      const cache = await GM.getValue(id); // get cache
      if (cache !== undefined && ((Date.now() - cache.time) < cachePeriod) && !GM_config.get('debugging')) { // check cache
        console.log(`${id} data from cache`);
        addLinks(cache.links); // add links
        UU.log(cache.item);
      } else { // get data from Wikidata
        console.log(`${id} data from Wikidata`);
        try {
          const data = await wikidata.links(id, 'IMDb', type);
          const item = data.item;
          const links = data.links;
          await GM.setValue(id, { links, item, time: Date.now() }); // set cache
          addLinks(links); // add links
          UU.log(item);
        } catch (error) {
          UU.error(error.message);
        }
      }
    });
  });
})();
