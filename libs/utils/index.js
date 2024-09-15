// ==UserScript==
// @author       Journey Over
// @exclude      *
// ==UserLibrary==
// @name         @journeyover/utils
// @description  Utils for my userscripts
// @license      MIT
// @version      1.0.0
// @homepageURL  https://github.com/StylusThemes/Userscripts
// ==/UserLibrary==
// @grant        GM.deleteValue
// @grant        GM.getValue
// @grant        GM.setValue
// ==/UserScript==

this.UserscriptUtils = (function () {
  /**
   * Utils for userscripts
   *
   * @class
   */
  class UserscriptUtils {
    /**
     * Initialize utils configuration
     *
     * @param {object} config Configuration
     * @param {string} config.name Userscript name
     * @param {string} config.version Userscript version
     * @param {string} config.author Userscript author
     * @param {string} [config.color='red'] Userscript header color
     * @param {boolean} [config.logging=false] Logging
     */
    constructor(config = {}) {
      const { name, author, version, color = 'red', logging = false } = config;

      if (!name) throw new Error('Userscript name is required');
      if (!author) throw new Error('Userscript author is required');

      const matches = /^(.*?)\s<\S[^\s@]*@\S[^\s.]*\.\S+>$/.exec(author);

      this._config = {
        name: name.toUpperCase(),
        version: version ?? undefined,
        author: matches?.[1] || author,
        color,
        logging
      };
    }

    /**
     * Initialize utils and log userscript header
     * Logs script config values if logging is true
     *
     * @param {string} id Config ID
     */
    async init(id) {
      const { name, version, author, color, logging } = this._config;
      const header = `%c${name}\n${version ? `%cv${version} ` : ''}by ${author} is running!`;
      console.log(header, `color:${color};font-weight:bold;font-size:18px;`, '');

      if (id && logging) {
        const data = JSON.parse(await GM.getValue(id));
        for (const [key, value] of Object.entries(data)) {
          console.log(`${name}:`, `${key} is "${value}"`);
        }
      }
    }

    /**
     * Log a message if logging is enabled
     *
     * @param {string} message Message
     */
    log(message) {
      if (this._config.logging) {
        console.log(`${this._config.name}:`, message);
      }
    }

    /**
     * Log an error message
     *
     * @param {string} message Message
     */
    error(message) {
      console.error(`${this._config.name}:`, message);
    }

    /**
     * Display an alert with the message
     *
     * @param {string} message Message
     */
    alert(message) {
      window.alert(`${this._config.name}: ${message}`);
    }

    /**
     * Returns a shortened version of a message
     *
     * @param {string} message Message
     * @param {number} length Maximum word length
     * @returns {string} Shortened message
     */
    short(message, length) {
      return message.split(' ').length > length
        ? `${message.split(' ', length).join(' ')} [...]`
        : message;
    }
  }

  /**
   * Migrate configuration from an old ID to a new ID
   *
   * @param {string} oldID Old config ID
   * @param {string} newID New config ID
   */
  UserscriptUtils.migrateConfig = async (oldID, newID) => {
    if (!oldID) throw new Error('An old config ID is required');
    if (!newID) throw new Error('A new config ID is required');

    const oldConfig = await GM.getValue(oldID);
    if (oldConfig) {
      await GM.setValue(newID, oldConfig);
      await GM.deleteValue(oldID);
      window.location.reload(false);
    }
  };

  return UserscriptUtils;
})();
