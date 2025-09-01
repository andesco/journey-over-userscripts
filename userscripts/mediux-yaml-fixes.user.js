// ==UserScript==
// @name          Mediux - Yaml Fixes
// @version       2.0.1
// @description   Adds fixes and functions to Mediux
// @author        Journey Over
// @license       MIT
// @match         *://mediux.pro/*
// @require       https://cdn.jsdelivr.net/npm/jquery@3.7.1/dist/jquery.min.js
// @require       https://cdn.jsdelivr.net/gh/StylusThemes/Userscripts@5f2cbff53b0158ca07c86917994df0ed349eb96c/libs/gm/gmcompat.js
// @grant         GM.xmlHttpRequest
// @grant         GM.setValue
// @grant         GM.getValue
// @run-at        document-end
// @icon          https://www.google.com/s2/favicons?sz=64&domain=mediux.pro
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/mediux-yaml-fixes.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/mediux-yaml-fixes.user.js
// ==/UserScript==

(function() {
  'use strict';

  /**
   * MediuxFixes - Main application namespace
   *
   * This userscript enhances Mediux.pro by providing tools to:
   * - Extract and format YAML for posters and backdrops
   * - Process boxsets and their associated media
   * - Fix formatting issues in YAML for Kometa compatibility
   */
  const MediuxFixes = {
    // UI elements cache to avoid repeated DOM queries
    elements: {
      codeblock: null,
      buttons: {}
    },

    // Utility functions for common operations
    utils: {
      /**
       * Creates a promise that resolves after the specified time
       * @param {number} ms - Milliseconds to wait
       * @returns {Promise} - Promise that resolves after delay
       */
      sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      },

      /**
       * Checks if a value is a string
       * @param {any} value - Value to check
       * @returns {boolean} - True if value is a string
       */
      isString(value) {
        return typeof value === 'string';
      },

      /**
       * Checks if a value is a non-empty object (not null, not array, has keys)
       * @param {any} obj - Object to check
       * @returns {boolean} - True if object is valid and has properties
       */
      isNonEmptyObject(obj) {
        return (
          typeof obj === 'object' && // Check if it's an object
          obj !== null && // Check that it's not null
          !Array.isArray(obj) && // Ensure it's not an array
          Object.keys(obj).length > 0 // Check if it has keys
        );
      },

      /**
       * Displays a temporary notification on the page
       * @param {string} message - Text to display
       * @param {number} duration - How long to show the notification (ms)
       */
      showNotification(message, duration = 3000) {
        // Create the notification div
        const notification = document.createElement('div');
        const myleftDiv = document.querySelector('#myleftdiv');
        const parentDiv = $(myleftDiv).parent();

        // Set the styles
        Object.assign(notification.style, {
          width: '50%',
          height: '50%',
          backgroundColor: 'rgba(200, 200, 200, 0.85)',
          color: 'black',
          padding: '20px',
          borderRadius: '5px',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: '1000',
          display: 'none'
        });

        // Set the message
        notification.innerText = message;

        $(myleftDiv).after(notification);

        // Show the notification
        notification.style.display = 'flex';

        // Hide after specified duration
        setTimeout(() => {
          notification.style.display = 'none';
          parentDiv.removeChild(notification);
        }, duration);
      },

      /**
       * Updates a button's appearance to indicate success/failure
       * @param {HTMLElement} button - Button to update
       * @param {boolean} success - Whether operation was successful
       */
      updateButtonState(button, success = true) {
        // Visual feedback for button actions
        button.classList.remove('bg-gray-500');
        button.classList.add(success ? 'bg-green-500' : 'bg-red-500');

        // After 3 seconds, change it back to default
        setTimeout(() => {
          button.classList.remove('bg-green-500', 'bg-red-500');
          button.classList.add('bg-gray-500');
        }, 3000);
      },

      /**
       * Copies text to clipboard and shows notification
       * @param {string} text - Text to copy
       * @returns {Promise<boolean>} - Whether copy was successful
       */
      copyToClipboard(text) {
        return navigator.clipboard.writeText(text)
          .then(() => {
            this.showNotification("Results copied to clipboard!");
            return true;
          })
          .catch(err => {
            console.error('Failed to copy: ', err);
            this.showNotification("Failed to copy to clipboard", 3000);
            return false;
          });
      }
    },

    // Data retrieval functions to extract information from Mediux
    data: {
      /**
       * Extracts poster data from page scripts
       * @returns {Array} - Array of poster objects
       */
      getPosters() {
        const regexpost = /posterCheck/g;
        const scriptlist = document.querySelectorAll('script');

        // Search scripts from the end (newer scripts tend to be at the end)
        for (let i = scriptlist.length - 1; i >= 0; i--) {
          const element = scriptlist[i];
          if (regexpost.test(element.textContent)) {
            // Extract and parse the JSON data from the script
            let str = element.textContent.replace('self.__next_f.push(', '');
            str = str.substring(0, str.length - 1);
            const jsonString = JSON.parse(str)[1].split('{"set":')[1];
            const fullJson = `{"set":${jsonString}`;
            const parsedObject = JSON.parse(fullJson.substring(0, fullJson.length - 2));
            return parsedObject.set.files;
          }
        }
        return [];
      },

      /**
       * Extracts set data and creator information
       * @returns {Array} - Array of set objects
       */
      getSets() {
        const regexpost = /posterCheck/g;
        const scriptlist = document.querySelectorAll('script');

        for (let i = scriptlist.length - 1; i >= 0; i--) {
          const element = scriptlist[i];
          if (regexpost.test(element.textContent)) {
            // Extract and parse the JSON data from the script
            let str = element.textContent.replace('self.__next_f.push(', '');
            str = str.substring(0, str.length - 1);
            const jsonString = JSON.parse(str)[1].split('{"set":')[1];
            const fullJson = `{"set":${jsonString}`;
            const parsedObject = JSON.parse(fullJson.substring(0, fullJson.length - 2));
            // Store the creator's username for later use
            GMC.setValue('creator', parsedObject.set.user_created.username);
            return parsedObject.set.boxset.sets;
          }
        }
        return [];
      },

      /**
       * Fetches a specific set by ID
       * @param {string} setId - The ID of the set to fetch
       * @returns {Promise<string>} - HTML content of the set page
       */
      getSet(setId) {
        return new Promise((resolve, reject) => {
          GMC.xmlHttpRequest({
            method: 'GET',
            url: `https://mediux.pro/sets/${setId}`,
            timeout: 30000,
            onload: (response) => {
              resolve(response.responseText);
            },
            onerror: () => {
              console.log(`[Mediux Fixes] An error occurred loading set ${setId}`);
              reject(new Error('Request failed'));
            },
            ontimeout: () => {
              console.log(`[Mediux Fixes] It took too long to load set ${setId}`);
              reject(new Error('Request timed out'));
            }
          });
        });
      }
    },

    // YAML processing functions
    yaml: {
      /**
       * Loads and processes an entire boxset, generating YAML for all items
       * @param {HTMLElement} codeblock - Code element to update with results
       * @returns {Promise<void>}
       */
      async loadBoxset(codeblock) {
        const button = document.querySelector('#bsetbutton');
        let originalText = codeblock.textContent + '\n';
        const sets = MediuxFixes.data.getSets();
        const creator = await GMC.getValue('creator');
        const startTime = Date.now();
        let elapsedTime = 0;
        let processedMovies = [];

        // Replace codeblock text with a timer
        codeblock.innerText = "Processing... 0 seconds";

        // Setup progress display to show elapsed time and recently processed items
        const timerInterval = setInterval(() => {
          elapsedTime = Math.floor((Date.now() - startTime) / 1000);
          const latestMovies = processedMovies.slice(-3).join(', ');
          codeblock.innerText = `Processing... ${elapsedTime} seconds\nRecent processed: ${latestMovies}`;
        }, 1000);

        try {
          // Process each set in the boxset
          for (const set of sets) {
            try {
              // Fetch the set data
              const response = await MediuxFixes.data.getSet(set.id);
              const response2 = response.replaceAll('\\', ''); // Remove escape characters

              // Extract files data using regex
              const regexfiles = /"files":(\[{"id":.*?}]),"boxset":/s;
              const match = response2.match(regexfiles);

              if (match && match[1]) {
                let filesArray;
                try {
                  filesArray = JSON.parse(match[1]);
                } catch (error) {
                  console.error('Error parsing filesArray:', error);
                  continue;
                }

                // Filter out collection posters and sort by title
                const filteredFiles = filesArray
                  .filter(file => !file.title.trim().endsWith('Collection'))
                  .sort((a, b) => a.title.localeCompare(b.title));

                // Process each file (poster or backdrop)
                for (const f of filteredFiles) {
                  if (f.movie_id !== null) {
                    // Handle movie posters
                    const posterId = f.fileType === 'poster' && f.id.length > 0 ? f.id : 'N/A';
                    const movieId = MediuxFixes.utils.isNonEmptyObject(f.movie_id) ? f.movie_id.id : 'N/A';
                    const movieTitle = MediuxFixes.utils.isString(f.title) && f.title.length > 0 ? f.title.trimEnd() : 'N/A';

                    // Build YAML entry for movie poster
                    originalText += `  ${movieId}: # ${movieTitle} Poster by ${creator} on MediUX.  https://mediux.pro/sets/${set.id}\n    url_poster: https://api.mediux.pro/assets/${posterId}\n    `;
                    processedMovies.push(movieTitle);
                    console.log(`Title: ${movieTitle}\nPoster: ${posterId}`);
                  } else if (f.movie_id_backdrop !== null) {
                    // Handle movie backdrops
                    const backdropId = f.fileType === 'backdrop' && f.id.length > 0 ? f.id : 'N/A';
                    const movieId = MediuxFixes.utils.isNonEmptyObject(f.movie_id_backdrop) ? f.movie_id_backdrop.id : 'N/A';
                    originalText += `url_background: https://api.mediux.pro/assets/${backdropId}\n\n`;
                    console.log(`Backdrop: ${backdropId}\nMovie id: ${movieId}`);
                  }
                }
              }
            } catch (error) {
              console.error(`Error processing set ${set.id}:`, error);
            }
          }
        } finally {
          // Stop the timer when processing is complete
          clearInterval(timerInterval);
        }

        // Create a clickable link for copying the results
        codeblock.innerText = "Processing complete!";
        const copyLink = document.createElement('a');
        copyLink.href = "#";
        copyLink.innerText = "Click here to copy the results";
        copyLink.style.color = 'blue';
        copyLink.style.cursor = 'pointer';

        // Add click event listener to copy the results
        copyLink.addEventListener('click', async (e) => {
          e.preventDefault();
          try {
            await navigator.clipboard.writeText(originalText);
            codeblock.innerText = originalText;
            MediuxFixes.utils.updateButtonState(button);
            MediuxFixes.utils.showNotification("Results copied to clipboard!");
          } catch (err) {
            console.error('Failed to copy: ', err);
          }
        });

        // Append the link to the codeblock
        codeblock.appendChild(copyLink);
        const totalTime = Math.floor((Date.now() - startTime) / 1000);
        console.log(`Total time taken: ${totalTime} seconds`);
      },

      /**
       * Fixes missing season posters in YAML
       * @param {HTMLElement} codeblock - Code element to update
       */
      fixPosters(codeblock) {
        const button = document.querySelector('#fpbutton');
        let yaml = codeblock.textContent;
        const posters = MediuxFixes.data.getPosters();

        // Filter for season posters
        const seasons = posters.filter(poster => poster.title.includes("Season"));

        // Add each season poster to the YAML
        for (let i in seasons) {
          const current = seasons.filter(season => season.title.includes(`Season ${i}`));
          if (current.length > 0) {
            yaml += `      ${i}:\n        url_poster: https://api.mediux.pro/assets/${current[0].id}\n`;
          }
        }

        // Update codeblock and copy to clipboard
        codeblock.innerText = yaml;
        navigator.clipboard.writeText(yaml)
          .then(() => {
            MediuxFixes.utils.showNotification("Results copied to clipboard!");
            MediuxFixes.utils.updateButtonState(button);
          });
      },

      /**
       * Fixes missing season numbers in TitleCard YAML
       * @param {HTMLElement} codeblock - Code element to update
       */
      fixCards(codeblock) {
        const button = document.querySelector('#fcbutton');
        const str = codeblock.innerText;

        // Check if the YAML needs fixing (has episodes without season numbers)
        const regextest = /(seasons:\n)(        episodes:)/g;
        const regex = /(        episodes:)/g;

        if (regextest.test(str)) {
          // Add season numbers before each episodes section
          let counter = 1;
          const modifiedStr = str.replace(regex, (match) => {
            const newLine = `      ${counter++}:\n`;
            return `${newLine}${match}`;
          });

          // Update codeblock and copy to clipboard
          codeblock.innerText = modifiedStr;
          navigator.clipboard.writeText(modifiedStr)
            .then(() => {
              MediuxFixes.utils.showNotification("Results copied to clipboard!");
              MediuxFixes.utils.updateButtonState(button);
            });
        } else {
          MediuxFixes.utils.showNotification("No card formatting needed");
        }
      },

      /**
       * Formats TV show YAML for compatibility with Kometa
       * @param {HTMLElement} codeblock - Code element to update
       */
      formatTvYml(codeblock) {
        const button = document.querySelector('#fytvbutton');
        let yaml = codeblock.textContent;

        // Extract the set ID, title, and year from the YAML content
        const regexSet = /(\d+): # TVDB id for (.*?)\. Set by (.*?) on MediUX\. (https:\/\/mediux\.pro\/sets\/\d+)/;

        // Extract title and year from the HTML page
        const htmlTitle = document.querySelector('h1').textContent;
        const yearMatch = htmlTitle.match(/\((\d{4})\)/);
        const year = yearMatch ? yearMatch[1] : 'Unknown';

        const match = yaml.match(regexSet);
        if (match) {
          const setId = match[1];
          const title = match[2];
          const url = match[4];

          // Replace the header part with formatted metadata
          yaml = yaml.replace(regexSet, `# Posters from:\n# ${url}\n\nmetadata:\n\n  ${setId}: # ${title} (${year})`);
        }

        // Clean up the formatting
        // Remove any leading spaces from the header
        yaml = yaml.replace(/^\s+# Posters from:/m, `# Posters from:`);

        // Add quotes around URLs for YAML compatibility
        yaml = yaml.replace(/(url_poster|url_background): (https:\/\/api\.mediux\.pro\/assets\/[a-z0-9\-]+)/g, '$1: "$2"');

        // Fix season indentation for proper YAML hierarchy
        yaml = yaml.replace(/(\d+):\n\s+url_poster: (https:\/\/api\.mediux\.pro\/assets\/[a-z0-9\-]+)\n/g,
          (match, season, url) => `      ${season}:\n        url_poster: "${url}"\n`);

        // Update the code block and copy to clipboard
        codeblock.innerText = yaml;
        navigator.clipboard.writeText(yaml)
          .then(() => {
            MediuxFixes.utils.showNotification("YAML transformed and copied to clipboard!");
            MediuxFixes.utils.updateButtonState(button);
          });
      },

      /**
       * Formats Movie YAML for compatibility with Kometa
       * @param {HTMLElement} codeblock - Code element to update
       */
      formatMovieYml(codeblock) {
        const button = document.querySelector('#fymoviebutton');
        let yaml = codeblock.textContent;

        // Extract set URL from the YAML content
        const regexSet = /https:\/\/mediux\.pro\/sets\/\d+/;
        const urlMatch = yaml.match(regexSet);
        const url = urlMatch ? urlMatch[0] : null;

        if (url) {
          // Clean up individual movie entries while preserving ID, title and year
          yaml = yaml.replace(
            /(\d+):\s*#\s*(.*?)\s*\((\d{4})\).*?(https:\/\/mediux\.pro\/sets\/\d+)/g,
            (match, id, title, year) => `${id}: # ${title.trim()} (${year})`
          );

          // Add a standardized header with the set URL
          const header = `# Posters from:\n# ${url}\n\nmetadata:\n\n`;
          yaml = yaml.replace(/(^|\n)metadata:\n/g, '');
          yaml = header + yaml;

          // Format URLs with quotes and clean up whitespace
          yaml = yaml
            .replace(/(url_poster|url_background): (https:\/\/api\.mediux\.pro\/assets\/\S+)/g, '$1: "$2"')
            .replace(/(\n\n)(\s+\n)/g, '\n\n')
            .replace(/\n{3,}/g, '\n\n');
        }

        // Update the code block and copy to clipboard
        codeblock.innerText = yaml;
        navigator.clipboard.writeText(yaml)
          .then(() => {
            MediuxFixes.utils.showNotification("YAML transformed and copied to clipboard!");
            MediuxFixes.utils.updateButtonState(button);
          });
      }
    },

    // UI initialization and management
    ui: {
      /**
       * Creates the user interface elements and attaches event handlers
       */
      createInterface() {
        // Get the DOM elements
        const codeblock = document.querySelector('code.whitespace-pre-wrap');
        MediuxFixes.elements.codeblock = codeblock;

        // Restructure the page to make room for our custom UI
        const myDiv = document.querySelector('.flex.flex-col.space-y-1\\.5.text-center.sm\\:text-left');
        $(myDiv).children('h2, p').wrapAll('<div class="flex flex-row" style="align-items: center"><div id="myleftdiv" style="width: 25%; align: left"></div></div>');

        const myleftdiv = document.querySelector('#myleftdiv');

        // Define button configurations
        const buttons = [{
            id: 'fcbutton',
            title: 'Fix missing season numbers in TitleCard YAML',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-puzzle w-5 h-5"><path d="M7 2h10"></path><path d="M5 6h14"></path><rect width="18" height="12" x="3" y="10" rx="2"></rect></svg>',
            action: () => MediuxFixes.yaml.fixCards(codeblock)
          },
          {
            id: 'fpbutton',
            title: 'Fix missing season posters YAML',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image w-5 h-5"><path d="M2 7v10"></path><path d="M6 5v14"></path><rect width="12" height="18" x="10" y="3" rx="2"></rect></svg>',
            action: () => MediuxFixes.yaml.fixPosters(codeblock)
          },
          {
            id: 'bsetbutton',
            title: 'Generate YAML for associated boxset',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box w-5 h-5"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M7 7v10"></path><path d="M11 7v10"></path><path d="m15 7 2 10"></path></svg>',
            action: () => MediuxFixes.yaml.loadBoxset(codeblock)
          },
          {
            id: 'fytvbutton',
            title: 'Format TV show YAML for Kometa',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tv w-5 h-5"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>',
            action: () => MediuxFixes.yaml.formatTvYml(codeblock)
          },
          {
            id: 'fymoviebutton',
            title: 'Format Movie YAML for Kometa',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-film-reel w-5 h-5"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2"></circle><line x1="12" y1="4" x2="12" y2="20"></line><line x1="4" y1="12" x2="20" y2="12"></line><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"></circle></svg>',
            action: () => MediuxFixes.yaml.formatMovieYml(codeblock)
          }
        ];

        // Create a container for the buttons
        const buttonContainer = $('<div id="extbuttons" class="flex flex-row" style="margin-top: 10px"></div>');

        // Create each button and add it to the container
        buttons.forEach((button, index) => {
          const $button = $(`<button id="${button.id}" title="${button.title}" class="duration-500 py-1 px-2 text-xs bg-gray-500 text-white rounded flex items-center justify-center focus:outline-none"${index > 0 ? ' style="margin-left:10px"' : ''}>${button.icon}</button>`);
          $button.on('click', button.action);
          buttonContainer.append($button);
          MediuxFixes.elements.buttons[button.id] = $button[0];
        });

        // Add the buttons to the page
        $(myleftdiv).append(buttonContainer);
        $(myleftdiv).parent().append('<div style="width: 25%;"></div>');
      }
    },

    /**
     * Initialize the application
     * Waits for the code element to be present before setting up the UI
     */
    init() {
      waitForKeyElements("code.whitespace-pre-wrap", () => {
        this.ui.createInterface();
        console.log('[Mediux YAML Fixes] Initialized');
      });
    }
  };

  // Start the application
  MediuxFixes.init();

  /**
   * waitForKeyElements - A utility function for Greasemonkey scripts that
   * detects and handles AJAXed content.
   *
   * @param {string} selectorTxt - The jQuery selector for target elements
   * @param {Function} actionFunction - Function to run when elements are found
   * @param {boolean} bWaitOnce - If false, continue looking for new elements
   * @param {string} iframeSelector - Optional selector for iframe to search in
   */
  function waitForKeyElements(
    selectorTxt,
    /* Required: The jQuery selector string that
                        specifies the desired element(s).
                    */
    actionFunction,
    /* Required: The code to run when elements are
                             found. It is passed a jNode to the matched
                             element.
                         */
    bWaitOnce,
    /* Optional: If false, will continue to scan for
                    new elements even after the first match is
                    found.
                */
    iframeSelector
    /* Optional: If set, identifies the iframe to
                        search.
                    */
  ) {
    var targetNodes, btargetsFound;

    if (typeof iframeSelector == "undefined")
      targetNodes = jQuery(selectorTxt);
    else
      targetNodes = jQuery(iframeSelector).contents()
      .find(selectorTxt);

    if (targetNodes && targetNodes.length > 0) {
      btargetsFound = true;
      /*--- Found target node(s). Go through each and act if they
          are new.
      */
      targetNodes.each(function() {
        var jThis = jQuery(this);
        var alreadyFound = jThis.data('alreadyFound') || false;

        if (!alreadyFound) {
          //--- Call the payload function.
          var cancelFound = actionFunction(jThis);
          if (cancelFound)
            btargetsFound = false;
          else
            jThis.data('alreadyFound', true);
        }
      });
    } else {
      btargetsFound = false;
    }

    //--- Get the timer-control variable for this selector.
    var controlObj = waitForKeyElements.controlObj || {};
    var controlKey = selectorTxt.replace(/[^\w]/g, "_");
    var timeControl = controlObj[controlKey];

    //--- Now set or clear the timer as appropriate.
    if (btargetsFound && bWaitOnce && timeControl) {
      //--- The only condition where we need to clear the timer.
      clearInterval(timeControl);
      delete controlObj[controlKey]
    } else {
      //--- Set a timer, if needed.
      if (!timeControl) {
        timeControl = setInterval(function() {
            waitForKeyElements(selectorTxt,
              actionFunction,
              bWaitOnce,
              iframeSelector
            );
          },
          300
        );
        controlObj[controlKey] = timeControl;
      }
    }
    waitForKeyElements.controlObj = controlObj;
  }

})();
