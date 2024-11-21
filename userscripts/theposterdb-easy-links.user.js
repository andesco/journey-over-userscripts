// ==UserScript==
// @name          ThePosterDB - Easy Links
// @version       1.2.0
// @description   Add "Copy Poster Link" and "Copy Poster ID" buttons to all ThePosterDB pages
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

(function () {
  'use strict';

  // Styles
  const containerStyle = {
      display: 'flex',
      justifyContent: 'space-between',
      gap: '5px',
      marginTop: '5px',
  };

  const buttonStyle = {
      flex: '1',
      textAlign: 'center',
      cursor: 'pointer',
      backgroundColor: '#28965a',
      color: 'white',
      padding: '5px 10px',
      borderRadius: '5px',
      fontSize: '12px',
      border: '1px solid #219150',
      transition: 'background-color 0.3s, transform 0.2s',
  };

  const secondaryButtonStyle = {
      ...buttonStyle,
      backgroundColor: '#007bff',
      border: '1px solid #0056b3',
  };

  const notificationStyle = {
      position: 'fixed',
      top: '10px',
      right: '10px',
      padding: '10px',
      backgroundColor: '#4caf50',
      color: 'white',
      zIndex: 10000,
      borderRadius: '5px',
      boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)',
  };

  // Add hover effects to buttons
  const addHoverEffects = (button, hoverColor) => {
      button.hover(
          function () {
              $(this).css({
                  backgroundColor: hoverColor,
                  transform: 'scale(1.05)',
              });
          },
          function () {
              $(this).css({
                  backgroundColor: button.data('originalColor'),
                  transform: 'scale(1)',
              });
          }
      );
  };

  // Create and display a notification
  const showNotification = (message) => {
      const notification = $('<div>')
          .text(message)
          .css(notificationStyle)
          .appendTo('body');

      setTimeout(() => {
          notification.fadeOut(400, () => notification.remove());
      }, 3000);
  };

  // Add copy buttons to each poster
  const addCopyButtons = (posterElement) => {
      const posterId = posterElement.find('div[data-poster-id]').data('poster-id');

      // "Copy Link" button
      const copyLinkButton = $('<div>')
          .text('Copy Link')
          .css(buttonStyle)
          .data('originalColor', '#28965a')
          .on('click', () => {
              const posterLink = `https://theposterdb.com/api/assets/${posterId}`;
              GM_setClipboard(posterLink);
              showNotification('Link copied to clipboard!');
          });

      addHoverEffects(copyLinkButton, '#1e7948'); // Darker green on hover

      // "Copy ID" button
      const copyIdButton = $('<div>')
          .text('Copy ID')
          .css(secondaryButtonStyle)
          .data('originalColor', '#007bff')
          .on('click', () => {
              GM_setClipboard(posterId);
              showNotification('ID copied to clipboard!');
          });

      addHoverEffects(copyIdButton, '#0056b3'); // Darker blue on hover

      // Container for buttons
      const buttonContainer = $('<div>')
          .css(containerStyle)
          .append(copyLinkButton, copyIdButton);

      // Append buttons to the DOM
      posterElement.parent().append(buttonContainer);
  };

  // Process all poster elements
  $('.col-6 .hovereffect').each(function () {
      addCopyButtons($(this));
  });
})();
