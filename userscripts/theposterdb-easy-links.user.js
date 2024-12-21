// ==UserScript==
// @name          ThePosterDB - Easy Links
// @version       1.3.0
// @description   Makes it easier to copy data from ThePosterDB
// @author        Journey Over
// @license       MIT
// @match         *://theposterdb.com/*
// @require       https://code.jquery.com/jquery-3.5.1.min.js
// @grant         GM_setClipboard
// @icon          https://www.google.com/s2/favicons?sz=64&domain=theposterdb.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/theposterdb-easy-links.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/theposterdb-easy-links.user.js
// ==/UserScript==

(() => {
  'use strict';

  const STYLES = {
    notification: {
      position: 'fixed',
      top: '10px',
      right: '10px',
      padding: '10px',
      backgroundColor: '#4caf50',
      color: 'white',
      zIndex: 10000,
      borderRadius: '5px',
      boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
    },
    buttons: {
      container: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '5px',
        marginTop: '5px',
      },
      base: {
        flex: '1',
        textAlign: 'center',
        cursor: 'pointer',
        padding: '5px 10px',
        borderRadius: '5px',
        fontSize: '1rem',
        color: 'white',
        border: '1px solid',
        transition: 'background-color 0.3s, transform 0.2s',
      },
      link: {
        backgroundColor: '#28965a',
        borderColor: '#219150',
        hoverColor: '#1e7948',
      },
      id: {
        backgroundColor: '#007bff',
        borderColor: '#0056b3',
        hoverColor: '#0056b3',
      },
      metadata: {
        cursor: 'pointer',
        color: 'white',
        padding: '3px 8px',
        borderRadius: '4px',
        fontSize: '0.9rem',
        textDecoration: 'none',
        display: 'inline-block',
        border: '1px solid #5a6268',
        transition: 'background-color 0.3s, transform 0.2s',
      },
    },
  };

  class PosterManager {
    constructor() {
      this.posters = this.getPosters();
    }

    getPosters() {
      return Array.from(document.querySelectorAll('div.hovereffect'))
        .map(this.extractPosterData)
        .filter(Boolean)
        .sort((a, b) => (a.year === null) - (b.year === null) || a.year - b.year);
    }

    extractPosterData(posterDiv) {
      const titleTag = posterDiv.querySelector('p.p-0.mb-1.text-break');
      if (!titleTag) return null;

      const title = titleTag.textContent.trim();
      const titleClean = title.replace(/\(\d{4}\)/, '').trim();
      const year = title.match(/\((\d{4})\)/)?.at(1);

      if (titleClean.toLowerCase().includes('collection')) return null;

      const posterId = posterDiv.querySelector('div.overlay')?.getAttribute('data-poster-id');
      return posterId ? {
        title: titleClean,
        year: year ? parseInt(year, 10) : null,
        urlPoster: `https://theposterdb.com/api/assets/${posterId}`,
        posterId,
      } : null;
    }

    generateMetadata() {
      return this.posters
        .map(({ title, year, urlPoster }) =>
          `  "${title}":\n    match:\n      year: ${year || 'Unknown'}\n    url_poster: "${urlPoster}"\n`)
        .join('\n');
    }
  }

  class UIManager {
    constructor(posterManager) {
      this.posterManager = posterManager;
      this.setupUI();
    }

    showNotification(message, duration = 3000) {
      $('<div>')
        .text(message)
        .css(STYLES.notification)
        .appendTo('body')
        .fadeOut(duration, function() {
          $(this).remove();
        });
    }

    setupHoverEffects(element, hoverColor) {
      const originalColor = element.css('backgroundColor');
      element.hover(
        () => element.css({
          backgroundColor: hoverColor,
          transform: 'scale(1.05)',
        }),
        () => element.css({
          backgroundColor: originalColor,
          transform: 'scale(1)',
        })
      );
    }

    createButton(text, styles, clickHandler, notificationMessage) {
      const button = $('<div>')
        .text(text)
        .css({ ...STYLES.buttons.base, ...styles })
        .on('click', () => {
          clickHandler();
          this.showNotification(notificationMessage);
        });

      this.setupHoverEffects(button, styles.hoverColor);
      return button;
    }

    setupMetadataButton() {
      const button = $('<a>')
        .text('Copy Metadata')
        .css(STYLES.buttons.metadata)
        .on('click', () => {
          GM_setClipboard(this.posterManager.generateMetadata());
          this.showNotification('Metadata copied to clipboard');
        });

      this.setupHoverEffects(button, STYLES.buttons.metadata.hoverColor);
      button.appendTo($('div').first());
    }

    setupPosterButtons() {
      $('.col-6 .hovereffect').each((_, el) => {
        const posterId = $(el).find('div[data-poster-id]').data('poster-id');
        if (!posterId) return;

        const container = $('<div>').css(STYLES.buttons.container);

        this.createButton(
          'Copy Link',
          STYLES.buttons.link,
          () => GM_setClipboard(`https://theposterdb.com/api/assets/${posterId}`),
          'Link copied to clipboard'
        ).appendTo(container);

        this.createButton(
          'Copy ID',
          STYLES.buttons.id,
          () => GM_setClipboard(posterId),
          'ID copied to clipboard'
        ).appendTo(container);

        $(el).parent().append(container);
      });
    }

    setupUI() {
      this.setupMetadataButton();
      this.setupPosterButtons();
    }
  }

  // Initialize
  const posterManager = new PosterManager();
  new UIManager(posterManager);
})();
