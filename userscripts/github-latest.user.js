// ==UserScript==
// @name          GitHub - Latest
// @version       1.6.0
// @description   Always keep an eye on the latest activity of your favorite projects
// @author        Journey Over
// @license       MIT
// @match         *://github.com/*
// @grant         none
// @icon          https://www.google.com/s2/favicons?sz=64&domain=github.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/github-latest.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/github-latest.user.js
// ==/UserScript==

(function () {
  // Core function to add the 'Latest Issues' button
  function addLatestIssuesButton() {
    const reponavList = document.querySelector("nav.js-repo-nav > .UnderlineNav-body");

    // Exit if navigation list is not found or button already exists
    if (!reponavList || document.getElementById("latest-issues-button")) return;

    const latestButton = createLatestIssuesButton(reponavList.children[1]);
    reponavList.appendChild(latestButton);
  }

  // Creates the 'Latest Issues' button by cloning an existing tab and modifying it
  function createLatestIssuesButton(templateTab) {
    const latestButton = templateTab.cloneNode(true);

    // Set up button properties
    latestButton.firstElementChild.id = "latest-issues-button";
    latestButton.firstElementChild.href = `${latestButton.firstElementChild.href.split('?')[0]}?q=sort%3Aupdated-desc`;
    latestButton.firstElementChild.style.float = "right";
    latestButton.style.marginLeft = "auto";

    // Customize icon, label, and remove counter
    updateIcon(latestButton);
    updateLabel(latestButton, "Latest issues");
    removeCounter(latestButton);

    return latestButton;
  }

  // Updates the button icon to a 'flame' icon and adjusts spacing
  function updateIcon(button) {
    const icon = button.querySelector("svg");
    if (icon) {
      icon.setAttribute("viewBox", "0 0 16 16");
      icon.style.margin = "0 4px";
      icon.innerHTML = `
        <path fill-rule="evenodd" d="M5.05 0.31c0.81 2.17 0.41 3.38-0.52 4.31-0.98 1.05-2.55 1.83-3.63 3.36
        -1.45 2.05-1.7 6.53 3.53 7.7-2.2-1.16-2.67-4.52-0.3-6.61-0.61 2.03 0.53 3.33 1.94 2.86
        1.39-0.47 2.3 0.53 2.27 1.67-0.02 0.78-0.31 1.44-1.13 1.81 3.42-0.59 4.78-3.42
        4.78-5.56 0-2.84-2.53-3.22-1.25-5.61-1.52 0.13-2.03 1.13-1.89 2.75 0.09 1.08-1.02
        1.8-1.86 1.33-0.67-0.41-0.66-1.19-0.06-1.78 1.25-1.23 1.75-4.09-1.88-6.22l-0.02-0.02z"/>
      `;
    }
  }

  // Updates the button label
  function updateLabel(button, labelText) {
    const label = button.querySelector("span");
    if (label) label.textContent = labelText;
  }

  // Removes the counter from the button if it exists
  function removeCounter(button) {
    const counter = button.querySelector(".Counter, .counter");
    if (counter) counter.remove();
  }

  // Initialize and add button on initial load and dynamic navigation
  addLatestIssuesButton();
  document.addEventListener('turbo:render', addLatestIssuesButton);
})();
