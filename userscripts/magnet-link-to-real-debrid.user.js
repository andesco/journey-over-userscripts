// ==UserScript==
// @name          Magnet Link to Real-Debrid
// @version       2.1.1
// @description   Automatically send magnet links to Real-Debrid
// @author        Journey Over
// @license       MIT
// @match         *://*/*
// @grant         GM_xmlhttpRequest
// @grant         GM_getValue
// @grant         GM_setValue
// @grant         GM_registerMenuCommand
// @connect       api.real-debrid.com
// @icon          https://www.google.com/s2/favicons?sz=64&domain=real-debrid.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/magnet-link-to-real-debrid.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/magnet-link-to-real-debrid.user.js
// ==/UserScript==

(function() {
  'use strict';

  // Error classes for better error handling
  class ConfigurationError extends Error {
    constructor(message) {
      super(message);
      this.name = 'ConfigurationError';
    }
  }

  class RealDebridError extends Error {
    constructor(message, statusCode = null) {
      super(message);
      this.name = 'RealDebridError';
      this.statusCode = statusCode;
    }
  }

  // Configuration Management
  class ConfigManager {
    static #DEFAULT_CONFIG = {
      apiKey: '',
      allowedExtensions: ['mp3', 'm4b', 'mp4', 'mkv', 'cbz', 'cbr'],
      filterKeywords: ['sample', 'bloopers', 'trailer'],
      debugMode: false
    };

    static getConfig() {
      const storedConfig = GM_getValue('realDebridConfig');
      return storedConfig ? JSON.parse(storedConfig) : {
        ...this.#DEFAULT_CONFIG
      };
    }

    static saveConfig(config) {
      if (!config.apiKey) {
        throw new ConfigurationError('API Key is required');
      }
      GM_setValue('realDebridConfig', JSON.stringify(config));
    }

    static validateConfig(config) {
      const errors = [];
      if (!config.apiKey) errors.push('API Key is missing');
      if (!Array.isArray(config.allowedExtensions)) errors.push('Invalid extensions');
      if (!Array.isArray(config.filterKeywords)) errors.push('Invalid filter keywords');
      return errors;
    }
  }

  // Real-Debrid API Service
  class RealDebridService {
    #apiKey;
    #baseUrl = 'https://api.real-debrid.com/rest/1.0';
    #config;

    constructor(apiKey, config) {
      if (!apiKey) throw new ConfigurationError('API Key required');
      this.#apiKey = apiKey;
      this.#config = config;
    }

    async #request(method, endpoint, data = null) {
      return new Promise((resolve, reject) => {
        if (this.#config.debugMode) {
          console.log(`[DEBUG] API Request: ${method} ${endpoint}`, data);
        }

        GM_xmlhttpRequest({
          method,
          url: `${this.#baseUrl}${endpoint}`,
          headers: {
            'Authorization': `Bearer ${this.#apiKey}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          data: data ? new URLSearchParams(data).toString() : null,
          onload: response => {
            if (this.#config.debugMode) {
              console.log(`[DEBUG] API Response:`, {
                status: response.status,
                responseText: response.responseText
              });
            }

            // Check for error status codes
            if (response.status < 200 || response.status >= 300) {
              reject(new RealDebridError(`API Error: ${response.status}`, response.status));
              return;
            }

            try {
              // Handle potential empty responses
              const responseText = response.responseText.trim();
              const result = responseText ? JSON.parse(responseText) : {};
              resolve(result);
            } catch (error) {
              console.error('Parsing Error:', error);
              reject(new RealDebridError('Failed to parse API response', response.status));
            }
          },
          onerror: error => {
            console.error('Request Error:', error);
            reject(new RealDebridError('Network request failed', error.status))
          }
        });
      });
    }

    async addMagnet(magnetLink) {
      return this.#request('POST', '/torrents/addMagnet', {
        magnet: magnetLink
      });
    }

    async getTorrentInfo(torrentId) {
      return this.#request('GET', `/torrents/info/${torrentId}`);
    }

    async selectFiles(torrentId, files) {
      return this.#request('POST', `/torrents/selectFiles/${torrentId}`, {
        files
      });
    }

    async getExistingTorrents() {
      return this.#request('GET', '/torrents');
    }
  }

  // Magnet Link Processor
  class MagnetLinkProcessor {
    #config;
    #realDebridService;
    #existingTorrents = [];

    constructor(config, realDebridService) {
      this.#config = config;
      this.#realDebridService = realDebridService;
    }

    async initialize() {
      try {
        this.#existingTorrents = await this.#realDebridService.getExistingTorrents();
        if (this.#config.debugMode) {
          console.log('[DEBUG] Existing Torrents:', this.#existingTorrents);
        }
      } catch (error) {
        console.warn('Could not fetch existing torrents', error);
      }
    }

    getMagnetHash(magnetLink) {
      try {
        const magnetUri = new URL(magnetLink);
        return magnetUri.searchParams.get('xt')?.split(':').pop()?.toUpperCase() || null;
      } catch {
        return null;
      }
    }

    isTorrentExists(magnetHash) {
      return this.#existingTorrents.some(
        torrent => torrent.hash.toUpperCase() === magnetHash
      );
    }

    filterFiles(files) {
      return files.filter(file => {
        const fileExtension = file.path.split('.').pop().toLowerCase();
        const fileName = file.path.toLowerCase();
        const filePath = file.path.toLowerCase();

        // Check for excluded file extensions
        const isAllowedExtension = this.#config.allowedExtensions.includes(fileExtension);

        // Check for filtered keywords in filename using regex support
        const isFilteredOut = this.#config.filterKeywords.some(keyword => {
          const trimmedKeyword = keyword.trim().toLowerCase();

          let regex;
          if (trimmedKeyword.startsWith('/') && trimmedKeyword.endsWith('/')) {
            try {
              regex = new RegExp(trimmedKeyword.slice(1, -1), 'i');
            } catch (e) {
              console.warn(`Invalid regex pattern: ${trimmedKeyword}`, e);
              return false;
            }
          }

          // Check if regex pattern matches file name or path
          if (regex) {
            return regex.test(filePath) || regex.test(fileName);
          }

          // Default to string comparison if not regex
          const folderMatch = filePath.split('/').some(pathSegment =>
            pathSegment.includes(trimmedKeyword)
          );

          // Check if filtered keywords matches filename
          const fileNameMatch = fileName.includes(trimmedKeyword);

          return folderMatch || fileNameMatch;
        });

        return isAllowedExtension && !isFilteredOut;
      });
    }

    async processMagnetLink(magnetLink) {
      const magnetHash = this.getMagnetHash(magnetLink);

      if (!magnetHash) {
        throw new RealDebridError('Invalid magnet link');
      }

      if (this.isTorrentExists(magnetHash)) {
        throw new RealDebridError('Torrent already exists');
      }

      const {
        id: torrentId
      } = await this.#realDebridService.addMagnet(magnetLink);
      const {
        files
      } = await this.#realDebridService.getTorrentInfo(torrentId);

      const selectedFiles = this.filterFiles(files).map(file => file.id);

      if (selectedFiles.length === 0) {
        throw new RealDebridError('No matching files found');
      }

      await this.#realDebridService.selectFiles(torrentId, selectedFiles.join(','));
      return selectedFiles.length;
    }
  }

  // UI Utilities
  class UIManager {
    static createConfigDialog(currentConfig) {
      const dialog = document.createElement('div');
      dialog.innerHTML = `
          <div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:flex;justify-content:center;align-items:center;z-index:10000;font-family:Arial,sans-serif;">
              <div style="background:#1e1e2f;color:#ffffff;padding:35px;border-radius:16px;max-width:500px;width:90%;box-shadow:0 10px 30px rgba(0,0,0,0.5);border:1px solid #2c2c3a;">
                  <h2 style="text-align:center;color:#4db6ac;margin-bottom:25px;border-bottom:2px solid #4db6ac;padding-bottom:12px;">Real-Debrid Configuration</h2>

                  <div style="margin-bottom:20px;">
                      <label style="display:block;margin-bottom:8px;font-weight:bold;color:#b2ebf2;">API Key</label>
                      <input type="text" id="apiKey" placeholder="Enter your Real-Debrid API Key" value="${currentConfig.apiKey}"
                          style="width:100%;padding:12px;border:1px solid #4db6ac;border-radius:8px;background-color:#2c2c3a;color:#ffffff;">
                  </div>

                  <div style="margin-bottom:20px;">
                      <label style="display:block;margin-bottom:8px;font-weight:bold;color:#b2ebf2;">Allowed Extensions</label>
                      <textarea id="extensions" placeholder="Enter file extensions to allow"
                          style="width:100%;padding:12px;border:1px solid #4db6ac;border-radius:8px;background-color:#2c2c3a;color:#ffffff;min-height:80px;">${currentConfig.allowedExtensions.join(',')}</textarea>
                      <small style="color:#80cbc4;display:block;margin-top:6px;">Separate extensions with commas (e.g., mp4,mkv,avi)</small>
                  </div>

                  <div style="margin-bottom:20px;">
                      <label style="display:block;margin-bottom:8px;font-weight:bold;color:#b2ebf2;">Filter Keywords</label>
                      <textarea id="keywords" placeholder="Enter keywords to filter out"
                          style="width:100%;padding:12px;border:1px solid #4db6ac;border-radius:8px;background-color:#2c2c3a;color:#ffffff;min-height:80px;">${currentConfig.filterKeywords.join(',')}</textarea>
                      <small style="color:#80cbc4;display:block;margin-top:6px;">Separate keywords with commas (e.g., sample, /trailer/, /featurette?s/)</small>
                  </div>

                  <div style="margin-bottom:20px;">
                      <label style="display:flex;align-items:center;color:#b2ebf2;">
                          <input type="checkbox" id="debugMode" ${currentConfig.debugMode ? 'checked' : ''}
                              style="margin-right:12px;width:18px;height:18px;border-radius:4px;background-color:#2c2c3a;border:2px solid #4db6ac;">
                          Enable Debug Mode
                      </label>
                      <small style="color:#80cbc4;display:block;margin-top:6px;">Provides additional logging in the browser console</small>
                  </div>

                  <div style="display:flex;justify-content:space-between;margin-top:25px;">
                      <button id="saveBtn" style="background:#4db6ac;color:#1e1e2f;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;transition:all 0.3s ease-in-out;font-weight:bold;">Save</button>
                      <button id="cancelBtn" style="background:#e57373;color:#1e1e2f;border:none;padding:12px 24px;border-radius:8px;cursor:pointer;transition:all 0.3s ease-in-out;font-weight:bold;">Cancel</button>
                  </div>
              </div>
          </div>
      `;

      // Add hover effects
      const saveBtn = dialog.querySelector('#saveBtn');
      const cancelBtn = dialog.querySelector('#cancelBtn');

      saveBtn.addEventListener('mouseover', () => saveBtn.style.background = '#2980b9');
      saveBtn.addEventListener('mouseout', () => saveBtn.style.background = '#3498db');

      cancelBtn.addEventListener('mouseover', () => cancelBtn.style.background = '#c0392b');
      cancelBtn.addEventListener('mouseout', () => cancelBtn.style.background = '#e74c3c');

      return dialog;
    }

    static displayMessage(message, type = 'info') {
      const colors = {
        'success': 'green',
        'error': 'red',
        'info': 'blue'
      };

      const msgDiv = document.createElement('div');
      Object.assign(msgDiv.style, {
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        backgroundColor: colors[type],
        color: 'white',
        padding: '10px',
        borderRadius: '5px',
        zIndex: 10000
      });

      msgDiv.textContent = message;
      document.body.appendChild(msgDiv);
      setTimeout(() => msgDiv.remove(), 3000);
    }

    static addMagnetIcon(link) {
      const icon = document.createElement('img');
      icon.src = 'https://fcdn.real-debrid.com/0830/favicons/favicon.ico';
      icon.style.cursor = 'pointer';
      icon.style.width = '16px';
      icon.style.marginLeft = '5px';
      return icon;
    }
  }

  // Main Script Execution
  async function initializeScript() {
    try {
      const config = ConfigManager.getConfig();
      if (!config.apiKey) {
        console.warn('Real-Debrid API key not configured');
        return;
      }

      const realDebridService = new RealDebridService(config.apiKey, config);
      const magnetLinkProcessor = new MagnetLinkProcessor(config, realDebridService);
      await magnetLinkProcessor.initialize();

      const magnetLinks = document.querySelectorAll('a[href^="magnet:"]');
      magnetLinks.forEach(link => {
        const icon = UIManager.addMagnetIcon(link);
        icon.addEventListener('click', async () => {
          try {
            await magnetLinkProcessor.processMagnetLink(link.href);
            UIManager.displayMessage('Magnet link processed successfully!', 'success');
            icon.style.filter = 'invert(50%)';
          } catch (error) {
            UIManager.displayMessage(error.message, 'error');
            console.error(error);
          }
        });
        link.parentNode.insertBefore(icon, link.nextSibling);
      });
    } catch (error) {
      console.error('Script initialization failed', error);
    }
  }

  // Configuration Dialog Setup
  GM_registerMenuCommand('Configure Real-Debrid Settings', () => {
    const currentConfig = ConfigManager.getConfig();
    const dialog = UIManager.createConfigDialog(currentConfig);

    document.body.appendChild(dialog);

    const saveBtn = dialog.querySelector('#saveBtn');
    const cancelBtn = dialog.querySelector('#cancelBtn');

    saveBtn.addEventListener('click', () => {
      const newConfig = {
        apiKey: dialog.querySelector('#apiKey').value.trim(),
        allowedExtensions: dialog.querySelector('#extensions').value.split(',').map(e => e.trim()).filter(Boolean),
        filterKeywords: dialog.querySelector('#keywords').value.split(',').map(k => k.trim()).filter(Boolean),
        debugMode: dialog.querySelector('#debugMode').checked
      };

      try {
        ConfigManager.saveConfig(newConfig);
        document.body.removeChild(dialog);
        UIManager.displayMessage('Configuration saved successfully!', 'success');
      } catch (error) {
        UIManager.displayMessage(error.message, 'error');
      }
    });

    cancelBtn.addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
  });

  // Script Auto-Initialization
  initializeScript();
})();
