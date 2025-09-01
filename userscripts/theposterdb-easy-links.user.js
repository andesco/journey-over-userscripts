// ==UserScript==
// @name          ThePosterDB - Easy Links
// @version       2.0.2
// @description   Makes it easier to copy data from ThePosterDB
// @author        Journey Over
// @license       MIT
// @match         *://theposterdb.com/*
// @require       https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@5f2cbff53b0158ca07c86917994df0ed349eb96c/libs/gm/gmcompat.js
// @grant         GM.setClipboard
// @grant         GM.addStyle
// @icon          https://www.google.com/s2/favicons?sz=64&domain=theposterdb.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/theposterdb-easy-links.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/theposterdb-easy-links.user.js
// ==/UserScript==

(function() {
  'use strict';

  // Constants and Configuration
  const CONFIG = {
    selectors: {
      gridPosters: '.col-6 .hovereffect',
      mainPoster: '#main_poster_container',
      copyLinkBtn: '.copy_poster_link',
      titleText: 'p.p-0.mb-1.text-break',
      overlay: 'div.overlay'
    },
    attributes: {
      posterId: 'data-poster-id',
      clipboardText: 'data-clipboard-text'
    },
    urls: {
      apiBase: 'https://theposterdb.com/api/assets'
    },
    notifications: {
      duration: 3000,
      messages: {
        link: 'Link copied to clipboard',
        id: 'ID copied to clipboard',
        metadata: 'Metadata copied to clipboard'
      }
    }
  };

  // CSS Styles
  const STYLES = `
    .tpdb-notification {
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 10px;
      background-color: #4caf50;
      color: white;
      z-index: 10000;
      border-radius: 5px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
      transition: opacity 0.3s ease-in-out;
    }

    .tpdb-button-container {
      display: flex;
      justify-content: space-between;
      gap: 5px;
      margin-top: 5px;
    }

    .tpdb-button {
      flex: 1;
      text-align: center;
      cursor: pointer;
      padding: 5px 10px;
      border-radius: 5px;
      font-size: 1rem;
      color: white;
      border: 1px solid;
      transition: all 0.3s ease;
    }

    .tpdb-button:hover {
      transform: scale(1.05);
    }

    .tpdb-button-link {
      background-color: #28965a;
      border-color: #219150;
    }

    .tpdb-button-link:hover {
      background-color: #1e7948;
    }

    .tpdb-button-id {
      background-color: #007bff;
      border-color: #0056b3;
    }

    .tpdb-button-id:hover {
      background-color: #0056b3;
    }

    .tpdb-metadata-button {
      cursor: pointer !important;
      color: white;
      background: transparent;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 0.9rem;
      text-decoration: none;
      display: inline-block;
      border: 1px solid #5a6268;
      transition: all 0.3s ease;
    }

    .tpdb-metadata-button:hover {
      background-color: #5a6268;
      transform: scale(1.05);
    }
  `;

  /**
   * Utility class for common operations
   */
  class Utils {
    static async fadeOut(element, duration) {
      element.style.opacity = '0';
      await new Promise(resolve => setTimeout(resolve, duration));
      element.remove();
    }

    static createUrl(posterId) {
      return `${CONFIG.urls.apiBase}/${posterId}`;
    }

    static isValidPosterId(posterId) {
      return posterId && /^\d+$/.test(posterId);
    }
  }

  /**
   * Handles all notification-related functionality
   */
  class NotificationManager {
    static show(message, duration = CONFIG.notifications.duration) {
      const notification = document.createElement('div');
      notification.className = 'tpdb-notification';
      notification.textContent = message;
      document.body.appendChild(notification);

      // Wait for the notification to be visible for `duration` ms before fading out
      setTimeout(() => {
        Utils.fadeOut(notification, 300); // Fade out over 300ms
      }, duration);
    }
  }

  /**
   * Manages poster data and operations
   */
  class PosterData {
    constructor(element) {
      this.element = element;
      this.posterId = this.extractPosterId();
      this.title = this.extractTitle();
      this.year = this.extractYear();
    }

    extractPosterId() {
      const overlay = this.element.querySelector(CONFIG.selectors.overlay);
      return overlay?.getAttribute(CONFIG.attributes.posterId);
    }

    extractTitle() {
      const titleElement = this.element.querySelector(CONFIG.selectors.titleText);
      return titleElement?.textContent.trim().replace(/\(\d{4}\)/, '').trim() || '';
    }

    extractYear() {
      const titleElement = this.element.querySelector(CONFIG.selectors.titleText);
      const match = titleElement?.textContent.match(/\((\d{4})\)/);
      return match ? parseInt(match[1], 10) : null;
    }

    get apiUrl() {
      return Utils.createUrl(this.posterId);
    }

    toMetadata() {
      return `  "${this.title}":\n    match:\n      year: ${this.year || 'Unknown'}\n    url_poster: "${this.apiUrl}"`;
    }
  }

  /**
   * Manages UI components and interactions
   */
  class UIManager {
    constructor() {
      this.setupStyles();
      this.initializeUI();
    }

    setupStyles() {
      GMC.addStyle(STYLES);
    }

    createButton(text, className, clickHandler) {
      const button = document.createElement('button');
      button.className = `tpdb-button ${className}`;
      button.textContent = text;
      button.addEventListener('click', clickHandler);
      return button;
    }

    createButtonContainer(posterId) {
      const container = document.createElement('div');
      container.className = 'tpdb-button-container';

      const linkButton = this.createButton('Copy Link', 'tpdb-button-link', () => {
        GMC.setClipboard(Utils.createUrl(posterId));
        NotificationManager.show(CONFIG.notifications.messages.link);
      });

      const idButton = this.createButton('Copy ID', 'tpdb-button-id', () => {
        GMC.setClipboard(posterId);
        NotificationManager.show(CONFIG.notifications.messages.id);
      });

      container.append(linkButton, idButton);
      return container;
    }

    setupMainPosterButtons() {
      const copyLinkBtn = document.querySelector(CONFIG.selectors.copyLinkBtn);
      if (!copyLinkBtn) return;

      const posterId = copyLinkBtn.getAttribute(CONFIG.attributes.posterId);
      if (!Utils.isValidPosterId(posterId)) return;

      // Modify existing copy link button
      copyLinkBtn.setAttribute(CONFIG.attributes.clipboardText, Utils.createUrl(posterId));
      copyLinkBtn.addEventListener('click', () => {
        NotificationManager.show(CONFIG.notifications.messages.link);
      });

      // Add new ID button
      const idButton = document.createElement('button');
      idButton.className = 'btn btn-outline-warning clipboard';
      idButton.setAttribute(CONFIG.attributes.clipboardText, posterId);
      idButton.setAttribute('data-toggle', 'tooltip');
      idButton.setAttribute('data-placement', 'top');
      idButton.setAttribute('title', 'Copy Poster ID');
      idButton.innerHTML = '<span class="d-none">Copy ID</span> <i class="fas fa-hashtag"></i>';

      idButton.addEventListener('click', () => {
        NotificationManager.show(CONFIG.notifications.messages.id);
      });

      copyLinkBtn.parentNode.insertBefore(idButton, copyLinkBtn.nextSibling);

      // Initialize clipboard.js if available
      if (window.ClipboardJS) {
        new ClipboardJS(idButton);
      }
    }

    setupGridPosters() {
      document.querySelectorAll(CONFIG.selectors.gridPosters).forEach(element => {
        const posterData = new PosterData(element);
        if (!Utils.isValidPosterId(posterData.posterId)) return;

        const container = this.createButtonContainer(posterData.posterId);
        element.parentElement.appendChild(container);
      });
    }

    setupMetadataButton() {
      const posters = Array.from(document.querySelectorAll(CONFIG.selectors.gridPosters))
        .map(element => new PosterData(element))
        .filter(poster => Utils.isValidPosterId(poster.posterId));

      if (posters.length === 0) return;

      const button = document.createElement('button');
      button.className = 'tpdb-metadata-button';
      button.textContent = 'Copy Metadata';
      button.addEventListener('click', () => {
        const metadata = `metadata:\n\n${posters.map(p => p.toMetadata()).join('\n\n')}`;
        GMC.setClipboard(metadata);
        NotificationManager.show(CONFIG.notifications.messages.metadata);
      });

      document.querySelector('div')?.appendChild(button);
    }

    initializeUI() {
      this.setupMainPosterButtons();
      this.setupGridPosters();
      this.setupMetadataButton();
    }
  }

  // Initialize when DOM is ready
  $(document).ready(() => {
    new UIManager();
  });
})();
