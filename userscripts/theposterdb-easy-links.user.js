// ==UserScript==
// @name          ThePosterDB - Easy Links
// @version       1.1.1
// @description   Add "Copy Poster Link" button to all ThePosterDB pages
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

    // Common styles
    const buttonStyle = {
      textAlign: 'center',
      cursor: 'pointer',
      marginTop: '5px',
      backgroundColor: '#28965a',
      color: 'white',
      padding: '5px',
      borderRadius: '3px',
      zIndex: 1000, // Ensure the button is above other elements
      position: 'relative', // Keep button relative to the flow of the page
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
      boxShadow: '0 0 10px rgba(0, 0, 0, 0.5)'
    };

    // Function to create and show a notification
    const showNotification = (message) => {
      const notification = $('<div>').text(message).css(notificationStyle).appendTo('body');

      // Automatically fade out and remove the notification after 3 seconds
      setTimeout(() => {
        notification.fadeOut(400, () => notification.remove());
      }, 3000);
    };

    // Function to add the copy button to each poster
    const addCopyButton = (posterElement) => {
      const posterId = posterElement.find('div[data-poster-id]').data('poster-id');
      const copyButton = $('<div>').text('COPY LINK TO CLIPBOARD').css(buttonStyle);

      // Copy poster link to clipboard on button click
      copyButton.on('click', () => {
        const posterLink = `https://theposterdb.com/api/assets/${posterId}`;
        GM_setClipboard(posterLink);
        showNotification('Link copied to clipboard!');
      });

      // Insert the button after the poster element, not inside it to avoid hover interference
      posterElement.parent().append(copyButton);
    };

    // Loop through all poster elements and add the copy button
    $('.col-6 .hovereffect').each(function () {
      addCopyButton($(this));
    });

  })();
