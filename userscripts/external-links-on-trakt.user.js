// ==UserScript==
// @name          External links on Trakt
// @version       2.1.0
// @description   Adds more external links to Trakt.tv pages.
// @author        Journey Over
// @license       MIT
// @match         *://trakt.tv/*
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

/* global $, NodeCreationObserver, Wikidata */

(() => {
  const CONSTANTS = {
    CACHE_DURATION: 36E5, // 1 hour in milliseconds
    SCRIPT_ID: GM.info.script.name.toLowerCase().replace(/\s/g, '-'),
    CONFIG_KEY: 'enhanced-trakt-links-config',
    TITLE: `${GM.info.script.name} Settings`,
    SCRIPT_NAME: GM.info.script.name
  };

  // Link providers configuration
  const LINK_PROVIDERS = {
    BROCOFLIX: {
      id: 'brocoflix',
      name: 'BrocoFlix',
      description:
        'Provides a direct link to the BrocoFlix streaming page for the selected title.',
      getUrl: ({ tmdbId, type }) =>
        `https://brocoflix.com/pages/info?id=${tmdbId}&type=${type === 'tv' ? 'tv' : 'movie'}`,
      requires: ['tmdbId'],
    },
    CINEBY: {
      id: 'cineby',
      name: 'Cineby',
      description:
        'Provides a direct link to the Cineby streaming page for the selected title.',
      getUrl: ({ tmdbId, type, season, episode }) => {
        const baseUrl = 'https://www.cineby.app';
        const mediaType = type === 'tv' ? 'tv' : 'movie';
        return `${baseUrl}/${mediaType}/${tmdbId}${
          type === 'tv' ? `/${season}/${episode}` : ''
        }`;
      },
      requires: ['tmdbId'],
    },
    DMM: {
      id: 'dmm',
      name: 'DMM',
      description:
        'Provides a direct link to Debrid Media Manager for the selected title.',
      getUrl: ({ imdbId, type, season }) => {
        const baseUrl = 'https://debridmediamanager.com';
        const mediaType = type === 'tv' ? 'show' : 'movie';
        return `${baseUrl}/${mediaType}/${imdbId}${type === 'tv' ? `/${season}` : ''}`;
      },
      requires: ['imdbId'],
    },
    FREEK: {
      id: 'freek',
      name: 'Freek',
      description:
        'Provides a direct link to the Freek streaming page for the selected title.',
      getUrl: ({ tmdbId, type, season, episode }) => {
        const baseUrl = 'https://freek.to';
        const mediaType = type === 'tv' ? 'tv' : 'movie';
        return `${baseUrl}/watch/${mediaType}/${tmdbId}${
          type === 'tv' ? `?season=${season}&ep=${episode}` : ''
        }`;
      },
      requires: ['tmdbId'],
    },
    MEDIUX: {
      id: 'mediux',
      name: 'Mediux',
      description:
        'Provides a direct link to the Mediux Poster site for the selected title.',
      getUrl: ({ tmdbId, type }) =>
        `https://mediux.pro/${type === 'tv' ? 'shows' : 'movies'}/${tmdbId}`,
      requires: ['tmdbId'],
    },
    PSTREAM: {
      id: 'pstream',
      name: 'P-Stream',
      description:
        'Provides a direct link to the P-Stream embedded player for the selected title.',
      getUrl: ({ tmdbId, type, season, episode }) => {
        const baseUrl = 'https://iframe.pstream.org';
        const mediaType = type === 'tv' ? 'tv' : 'movie';
        return `${baseUrl}/embed/tmdb-${mediaType}-${tmdbId}${
          type === 'tv' ? `/${season}/${episode}` : ''
        }`;
      },
      requires: ['tmdbId'],
    },
    RIVE: {
      id: 'rive',
      name: 'Rive',
      description:
        'Provides a direct link to the Rive streaming page for the selected title.',
      getUrl: ({ tmdbId, type, season, episode }) => {
        const baseUrl = 'https://rivestream.live';
        const mediaType = type === 'tv' ? 'tv' : 'movie';
        return `${baseUrl}/watch?type=${mediaType}&id=${tmdbId}${
          type === 'tv' ? `&season=${season}&episode=${episode}` : ''
        }`;
      },
      requires: ['tmdbId'],
    },
    WOVIE: {
      id: 'wovie',
      name: 'Wovie',
      description:
        'Provides a direct link to the Wovie streaming page for the selected title.',
      getUrl: ({ tmdbId, type, sanitizedTitle, season, episode }) => {
        const baseUrl = 'https://wovie.vercel.app';
        const mediaType = type === 'tv' ? 'tv' : 'movie';
        return `${baseUrl}/play/${mediaType}/${tmdbId}/${sanitizedTitle}${
          type === 'tv' ? `?season=${season}&episode=${episode}` : ''
        }`;
      },
      requires: ['tmdbId'],
    },
    XPRIME: {
      id: 'xprime',
      name: 'XPrime',
      description:
        'Provides a direct link to the XPrime streaming page for the selected title.',
      getUrl: ({ tmdbId, type, season, episode }) => {
        const baseUrl = 'https://xprime.tv';
        return `${baseUrl}/watch/${tmdbId}${
          type === 'tv' ? `/${season}/${episode}` : ''
        }`;
      },
      requires: ['tmdbId'],
    },
  };

  // Default configuration
  const DEFAULT_CONFIG = {
    logging: false,    // Controls info/warn/error logs
    debugging: false,  // Controls debug logs
    enabledLinks: Object.fromEntries(
      Object.values(LINK_PROVIDERS).map(({ id }) => [id, false])
    )
  };

  class DirectLinksProvider {
    constructor(mediaInfo, config, logger) {
      this.mediaInfo = mediaInfo;
      this.config = config;
      this.logger = logger;
    }

    addLinks() {
      Object.values(LINK_PROVIDERS).forEach(provider => {
        try {
          if (this.shouldAddProvider(provider)) {
            this.createLink(provider);
          }
        } catch (error) {
          this.logger.error(`Error creating ${provider.name} link: ${error.message}`);
        }
      });
    }

    shouldAddProvider(provider) {
      const isConfigurable = provider.id && this.config.enabledLinks[provider.id];
      const isNonConfigurable = !provider.id;
      return (isConfigurable || isNonConfigurable) &&
             this.areRequirementsMet(provider.requires);
    }

    areRequirementsMet(requiredFields) {
      return requiredFields.every(field => this.mediaInfo[field]);
    }

    createLink(provider) {
      const url = provider.getUrl(this.mediaInfo);
      const linkId = `external-link-${provider.name.toLowerCase().replace(/\s/g, '_')}`;
      const linkHtml = `<a target="_blank" id="${linkId}" href="${url}" data-original-title="" title="">${provider.name}</a>`;
      $('.external li').append(linkHtml);
      this.logger.debug(`Added ${provider.name} link: ${url}`);
    }
  }

  class TraktExternalLinks {
    constructor() {
      this.config = { ...DEFAULT_CONFIG };
      this.wikidata = null;

      // Bind methods to ensure proper `this` context
      this.getMediaInfo = this.getMediaInfo.bind(this);
      this.handleExternalLinks = this.handleExternalLinks.bind(this);
    }

    // Logging methods
    info(message, ...args) {
      if (this.config.logging) {
        console.info(`${CONSTANTS.SCRIPT_NAME}: INFO: ${message}`, ...args);
      }
    }

    warn(message, ...args) {
      if (this.config.logging) {
        console.warn(`${CONSTANTS.SCRIPT_NAME}: WARN: ${message}`, ...args);
      }
    }

    error(message, ...args) {
      if (this.config.logging) {
        console.error(`${CONSTANTS.SCRIPT_NAME}: ERROR: ${message}`, ...args);
      }
    }

    debug(message, ...args) {
      if (this.config.debugging) {
        console.debug(`${CONSTANTS.SCRIPT_NAME}: DEBUG: ${message}`, ...args);
      }
    }

    // Initialization and core functionality
    async init() {
      await this.loadConfig();
      this.initializeWikidata();
      this.logInitialization();
      this.setupEventListeners();
    }

    logInitialization() {
      const { version, author } = GM.info.script;
      const headerStyle = 'color:red;font-weight:bold;font-size:18px;';
      const versionText = version ? `v${version} ` : '';

      console.log(
        `%c${CONSTANTS.SCRIPT_NAME}\n%c${versionText}by ${author} is running!`,
        headerStyle,
        ''
      );

      this.info('Script initialized');
      this.debug('Debugging mode enabled');
      this.debug('Current configuration:', this.config);
    }

    async loadConfig() {
      const savedConfig = await GM.getValue(CONSTANTS.CONFIG_KEY);
      if (savedConfig) {
        this.config = { ...DEFAULT_CONFIG, ...savedConfig };
      }
    }

    initializeWikidata() {
      this.wikidata = new Wikidata({ debug: this.config.debugging });
    }

    setupEventListeners() {
      NodeCreationObserver.onCreation('.sidebar .external', this.handleExternalLinks);
      NodeCreationObserver.onCreation('body', () => this.addSettingsMenu());
    }

    async handleExternalLinks() {
      try {
        await this.clearExpiredCache();
        const mediaInfo = this.getMediaInfo();

        if (mediaInfo.imdbId) {
          await this.processWikidataLinks(mediaInfo);
        }

        this.addDirectLinks(mediaInfo);
      } catch (error) {
        this.error(`Failed handling external links: ${error.message}`);
      }
    }

    getMediaInfo() {
      const pathParts = location.pathname.split('/');
      const type = pathParts[1] === 'movies' ? 'movie' : 'tv';
      const sanitizedTitle = pathParts[2] === 'seasons' || pathParts[2] === 'episodes'
        ? pathParts[2]
        : this.sanitizeTitle(pathParts[2]);

      const imdbLink = $('#external-link-imdb');
      const tmdbLink = $('#external-link-tmdb');

      const tmdbDetails = tmdbLink.length ? this.extractDetailsFromUrl(tmdbLink.attr('href')) : null;
      const imdbId = imdbLink.length ? imdbLink.attr('href')?.match(/tt\d+/)?.[0] : null;

      return {
        type,
        sanitizedTitle,
        imdbId,
        tmdbId: tmdbDetails?.tmdbId,
        season: tmdbDetails?.season,
        episode: tmdbDetails?.episode
      };
    }

    sanitizeTitle(title) {
      try {
        return title.replace(/-\d{4}$/, '');
      } catch (error) {
        this.error(`Failed to sanitize title: ${error.message}`);
        return title;
      }
    }

    extractDetailsFromUrl(url) {
      try {
        const parts = url.split('/');
        return {
          tmdbId: parts[4],
          season: parts[6] || '1',
          episode: parts[8] || '1'
        };
      } catch (error) {
        this.error(`Failed to extract URL details: ${error.message}`);
        return {
          tmdbId: null,
          season: '1',
          episode: '1'
        };
      }
    }

    async processWikidataLinks(mediaInfo) {
      const cache = await GM.getValue(mediaInfo.imdbId);

      if (this.isCacheValid(cache)) {
        this.debug('Using cached Wikidata data');
        this.addWikidataLinks(cache.links);
        return;
      }

      try {
        const data = await this.wikidata.links(mediaInfo.imdbId, 'IMDb', mediaInfo.type);
        await GM.setValue(mediaInfo.imdbId, {
          links: data.links,
          item: data.item,
          time: Date.now()
        });
        this.addWikidataLinks(data.links);
        this.debug('New Wikidata data fetched:', data.item);
      } catch (error) {
        this.error(`Failed fetching Wikidata links: ${error.message}`);
      }
    }

    addDirectLinks(mediaInfo) {
      try {
        const provider = new DirectLinksProvider(mediaInfo, this.config, {
          error: this.error.bind(this),
          debug: this.debug.bind(this)
        });
        provider.addLinks();
        this.debug('Direct links added successfully');
      } catch (error) {
        this.error(`Failed adding direct links: ${error.message}`);
      }
    }

    addWikidataLinks(links) {
      Object.entries(links).forEach(([site, link]) => {
        if (site !== 'Trakt' && link?.value && !this.linkExists(site)) {
          this.createExternalLink(site, link.value);
        }
      });
    }

    isCacheValid(cache) {
      return cache &&
             !this.config.debugging &&
             (Date.now() - cache.time) < CONSTANTS.CACHE_DURATION;
    }

    linkExists(site) {
      return $(`#info-wrapper .sidebar .external li a#external-link-${site.toLowerCase().replace(/\s/g, '_')}`).length > 0;
    }

    createExternalLink(site, url) {
      const linkId = `external-link-${site.toLowerCase().replace(/\s/g, '_')}`;
      const link = `<a target="_blank" id="${linkId}" href="${url}" data-original-title="" title="">${site}</a>`;
      $('#info-wrapper .sidebar .external li a:not(:has(i))').last().after(link);
    }

    async clearExpiredCache() {
      const values = await GM.listValues();
      for (const value of values) {
        if (value === CONSTANTS.CONFIG_KEY) continue;
        const cache = await GM.getValue(value);
        if (cache?.time && (Date.now() - cache.time) > CONSTANTS.CACHE_DURATION) {
          await GM.deleteValue(value);
        }
      }
    }

    addSettingsMenu() {
      const menuItem = `<li class="${CONSTANTS.SCRIPT_ID}"><a href="javascript:void(0)">EL Settings</a></li>`;
      $('div.user-wrapper ul.menu li.divider').last().after(menuItem);
      $(`.${CONSTANTS.SCRIPT_ID}`).click(() => this.openSettingsModal());
    }

    openSettingsModal() {
      const modalHTML = this.generateSettingsModalHTML();
      $(modalHTML).appendTo('body');
      this.addModalStyles();
      this.setupModalEventListeners();
    }

    generateSettingsModalHTML() {
      return `
        <div id="${CONSTANTS.SCRIPT_ID}-config">
          <div class="modal-content">
            <div class="modal-header">
              <h2>${CONSTANTS.TITLE}</h2>
              <button class="close-button">&times;</button>
            </div>

            <div class="settings-sections">
              <div class="settings-section">
                <h3><i class="fas fa-cog"></i> General Settings</h3>
                <div class="setting-item">
                  <div class="setting-info">
                    <label for="logging">Enable Logging</label>
                    <div class="description">Show basic logs (info, warnings, errors) in console</div>
                  </div>
                  <label class="switch">
                    <input type="checkbox" id="logging" ${this.config.logging ? 'checked' : ''}>
                    <span class="slider"></span>
                  </label>
                </div>
                <div class="setting-item">
                  <div class="setting-info">
                    <label for="debugging">Enable Debugging</label>
                    <div class="description">Show detailed debug information in console</div>
                  </div>
                  <label class="switch">
                    <input type="checkbox" id="debugging" ${this.config.debugging ? 'checked' : ''}>
                    <span class="slider"></span>
                  </label>
                </div>
              </div>

              <div class="settings-section">
                <h3><i class="fas fa-external-link-alt"></i> Extra External Links</h3>
                ${this.generateExternalLinksSettings()}
              </div>
            </div>

            <div class="modal-footer">
              <button class="btn save" id="save-config">Save & Reload</button>
              <button class="btn warning" id="clear-cache">Clear Cache</button>
            </div>
          </div>
        </div>
      `;
    }

    generateExternalLinksSettings() {
      return Object.values(LINK_PROVIDERS)
        .filter(provider => provider.id)
        .map(provider => `
          <div class="setting-item">
            <div class="setting-info">
              <label for="${provider.id}">${provider.name}</label>
              <div class="description">${provider.description}</div>
            </div>
            <label class="switch">
              <input type="checkbox" id="${provider.id}"
                ${this.config.enabledLinks[provider.id] ? 'checked' : ''}>
              <span class="slider"></span>
            </label>
          </div>
        `).join('');
    }

    addModalStyles() {
      const styles = `#${CONSTANTS.SCRIPT_ID}-config{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;display:flex;justify-content:center;align-items:center}.modal-content{background:#2b2b2b;color:#fff;border-radius:8px;width:450px;max-width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.3)}.modal-header{padding:1.5rem;border-bottom:1px solid #404040;position:relative;display:flex;justify-content:space-between;align-items:center}.modal-header h2{margin:0;font-size:1.4rem;color:#fff}.close-button{background:none;border:none;color:#fff;font-size:1.5rem;cursor:pointer;padding:0 0.5rem}.settings-sections{padding:1.5rem;max-height:60vh;overflow-y:auto}.settings-section{margin-bottom:2rem}.settings-section h3{font-size:1.1rem;margin:0 0 1.2rem;color:#fff;display:flex;align-items:center;gap:0.5rem}.setting-item{display:flex;justify-content:space-between;align-items:center;padding:0.8rem 0;border-bottom:1px solid #404040}.setting-info{flex-grow:1;margin-right:1.5rem}.setting-info label{display:block;font-weight:500;margin-bottom:0.3rem}.description{color:#a0a0a0;font-size:0.9rem;line-height:1.4}.switch{flex-shrink:0}.modal-footer{padding:1.5rem;border-top:1px solid #404040;display:flex;gap:0.8rem;justify-content:flex-end}.btn{padding:0.6rem 1.2rem;border-radius:4px;border:none;cursor:pointer;font-weight:500;transition:all 0.2s ease}.btn.save{background:#4CAF50;color:#fff}.btn.warning{background:#f44336;color:#fff}.btn:hover{opacity:0.9}`;
      $('<style>').prop('type', 'text/css').html(styles).appendTo('head');
    }

    setupModalEventListeners() {
      $('.close-button').click(() => $(`#${CONSTANTS.SCRIPT_ID}-config`).remove());

      $('#save-config').click(async () => {
        this.config.logging = $('#logging').is(':checked');
        this.config.debugging = $('#debugging').is(':checked');

        Object.values(LINK_PROVIDERS)
          .filter(provider => provider.id)
          .forEach(provider => {
            this.config.enabledLinks[provider.id] = $(`#${provider.id}`).is(':checked');
          });

        await GM.setValue(CONSTANTS.CONFIG_KEY, this.config);
        $(`#${CONSTANTS.SCRIPT_ID}-config`).remove();
        window.location.reload();
      });

      $('#clear-cache').click(async () => {
        const values = await GM.listValues();
        for (const value of values) {
          if (value === CONSTANTS.CONFIG_KEY) continue;
          await GM.deleteValue(value);
        }
        this.info('Cache cleared (excluding config)');
        $(`#${CONSTANTS.SCRIPT_ID}-config`).remove();
        window.location.reload();
      });
    }
  }

  // Initialize the script when the document is ready
  $(document).ready(async () => {
    const traktLinks = new TraktExternalLinks();
    await traktLinks.init();
  });
})();
