// ==UserScript==
// @name          Hy-Vee - Auto Clip Coupons
// @version       1.3.1
// @description   Add a button to manually clip all coupons on the Hy-Vee coupons page.
// @author        Journey Over
// @license       MIT
// @match         *://*.hy-vee.com/deals/coupons?offerState=Available
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@01f4e2891bed1a410f72fc6a778c1ba12966e820/libs/utils/utils.js
// @grant         none
// @icon          https://www.google.com/s2/favicons?sz=64&domain=hy-vee.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/hyvee-auto-click-coupons.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/hyvee-auto-click-coupons.user.js
// ==/UserScript==

(function() {
  'use strict';

  const logger = Logger('Hy-Vee - Auto Clip Coupons', { debug: false });

  // Constants for button styling and timing
  const BUTTON_STYLES = {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: '1000',
    padding: '10px 20px',
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
    fontSize: '16px',
  };

  const CLICK_DELAY = 500; // Delay between coupon clicks in milliseconds

  // Create and append the clipping button to the page
  function createClippingButton() {
    const button = document.createElement('button');
    button.innerText = 'Clip All Coupons';
    button.id = 'clipCouponsButton';

    // Apply styles to the button
    Object.assign(button.style, BUTTON_STYLES);

    // Add the button to the page
    document.body.appendChild(button);

    // Attach the click event listener
    button.addEventListener('click', handleClipCoupons);
  }

  // Handle the coupon clipping process
  function handleClipCoupons() {
    const clipButtons = document.querySelectorAll('button[aria-label^="Clip coupon"]');

    if (clipButtons.length === 0) {
      alert('No coupons found to clip.');
      return;
    }

    const clipButton = document.getElementById('clipCouponsButton');
    const totalCoupons = clipButtons.length;

    logger(`Found ${totalCoupons} coupons. Clipping...`);

    // Clip coupons one by one with a delay
    clipButtons.forEach((button, index) => {
      setTimeout(() => {
        button.click();
        updateButtonProgress(clipButton, totalCoupons, index);

        logger(`Clipped coupon ${index + 1}/${totalCoupons}`);

        // If all coupons are clipped, disable the button
        if (index === totalCoupons - 1) {
          finalizeButtonState(clipButton);
        }
      }, index * CLICK_DELAY);
    });
  }

  // Update the button text to show progress
  function updateButtonProgress(button, totalCoupons, currentIndex) {
    const remainingCoupons = totalCoupons - (currentIndex + 1);
    button.innerText = `Clipping Coupons... ${remainingCoupons} left`;
  }

  // Finalize the button state after all coupons are clipped
  function finalizeButtonState(button) {
    button.innerText = 'All Coupons Clipped!';
    button.style.backgroundColor = '#6c757d'; // Gray color
    button.style.cursor = 'default';
    button.disabled = true; // Disable the button
  }

  // Initialize the script after the page loads
  function initializeScript() {
    createClippingButton();
    logger('Clipping button added to the page.');
  }

  // Wait for the page to load before initializing the script
  window.addEventListener('load', initializeScript);
})();
