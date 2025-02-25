// ==UserScript==
// @name          Mediux - Yaml Fixes
// @version       1.1.1
// @description   Adds fixes and functions to Mediux
// @author        Journey Over
// @license       MIT
// @match         *://mediux.pro/*
// @require       https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js
// @grant         GM_xmlhttpRequest
// @grant         GM_setValue
// @grant         GM_getValue
// @run-at        document-end
// @icon          https://www.google.com/s2/favicons?sz=64&domain=mediux.pro
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/mediux-yaml-fixes.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/mediux-yaml-fixes.user.js
// ==/UserScript==

waitForKeyElements(
  "code.whitespace-pre-wrap",
  start);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isString(value) {
  return typeof value === 'string';
}

function isNonEmptyObject(obj) {
  return (
    typeof obj === 'object' &&     // Check if it's an object
    obj !== null &&                // Check that it's not null
    !Array.isArray(obj) &&         // Ensure it's not an array
    Object.keys(obj).length > 0    // Check if it has keys
  );
}

function showNotification(message) {
  // Create the notification div
  const notification = document.createElement('div');
  const myleftDiv = document.querySelector('#myleftdiv');
  const parentDiv = $(myleftDiv).parent();

  // Set the styles directly
  notification.style.width = '50%';
  notification.style.height = '50%';
  notification.style.backgroundColor = 'rgba(200, 200, 200, 0.85)'; // Semi-transparent
  notification.style.color = 'black';
  notification.style.padding = '20px';
  notification.style.borderRadius = '5px';
  notification.style.justifyContent = 'center';
  notification.style.alignItems = 'center';
  notification.style.zIndex = '1000'; // Ensure it’s on top
  notification.style.display = 'none'; // Initially hidden
  // Set the message
  notification.innerText = message;

  $(myleftDiv).after(notification);

  // Show the notification
  notification.style.display = 'flex';

  // Hide after 2-3 seconds
  setTimeout(() => {
    notification.style.display = 'none';
    parentDiv.removeChild(notification); // Remove it from the DOM
  }, 3000); // Adjust the time as needed
}

function get_posters() {
  const regexpost = /posterCheck/g
  var scriptlist = document.querySelectorAll('script')
  for (let i = scriptlist.length - 1; i >= 0; i--) {
    const element = scriptlist[i];
    if (regexpost.test(element.textContent)) {
      var str1 = element.textContent.replace('self.__next_f.push(', '');
      var str1 = str1.substring(0, str1.length - 1);
      var jsonString = JSON.parse(str1)[1].split('{"set":')[1];
      var fullJson = `{"set":${jsonString}`;
      var parsedObject = JSON.parse(fullJson.substring(0, fullJson.length - 2));
      return parsedObject.set.files;
    }
  }
}

function get_sets() {
  const regexpost = /posterCheck/g
  var scriptlist = document.querySelectorAll('script')
  for (let i = scriptlist.length - 1; i >= 0; i--) {
    const element = scriptlist[i];
    if (regexpost.test(element.textContent)) {
      var str1 = element.textContent.replace('self.__next_f.push(', '');
      var str1 = str1.substring(0, str1.length - 1);
      var jsonString = JSON.parse(str1)[1].split('{"set":')[1];
      var fullJson = `{"set":${jsonString}`;
      var parsedObject = JSON.parse(fullJson.substring(0, fullJson.length - 2));
      GM_setValue('creator', parsedObject.set.user_created.username);
      return parsedObject.set.boxset.sets;
    }
  }
}

function get_set(setnum) {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: 'GET',
      url: `https://mediux.pro/sets/` + setnum,
      timeout: 30000,
      onload: (response) => {
        resolve(response.responseText); // Resolve the promise with the response
      },
      onerror: () => {
        console.log('[Mediux Fixes] An error occurred loading set ${setnum}');
        reject(new Error('Request failed'));
      },
      ontimeout: () => {
        console.log('[Mediux Fixes] It took too long to load set ${setnum}');
        reject(new Error('Request timed out'));
      }
    });
  });
}

async function load_boxset(codeblock) {
  const button = document.querySelector('#bsetbutton');
  let originalText = codeblock.textContent; // Store the original content
  originalText += `\n`;
  const sets = get_sets();
  const creator = GM_getValue('creator');
  const startTime = Date.now();
  let elapsedTime = 0;
  let latestMovieTitle = ""; // Variable to store the latest movie title

  // Replace codeblock text with a timer
  codeblock.innerText = "Processing... 0 seconds";

  const timerInterval = setInterval(() => {
    elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    codeblock.innerText = `Processing... ${elapsedTime} seconds\nProcessed Movies: ${latestMovieTitle}`;
  }, 1000);

  for (const set of sets) {
    try {
      const response = await get_set(set.id);
      const response2 = response.replaceAll('\\', '');
      const regexfiles = /"files":(\[{"id":.*?}]),"boxset":/s;
      const match = response2.match(regexfiles);


      if (match && match[1]) {
        let filesArray;
        try {
          filesArray = JSON.parse(match[1]);
        } catch (error) {
          console.error('Error parsing filesArray:', error);
          return;
        }
        const filteredFiles = filesArray.filter(file => !file.title.trim().endsWith('Collection'))
        filteredFiles.sort((a, b) => a.title.localeCompare(b.title))
        for (const f of filteredFiles) {
          if (f.movie_id !== null) {
            const posterId = f.fileType = 'poster' && f.id.length > 0 ? f.id : 'N/A';
            const movieId = isNonEmptyObject(f.movie_id) ? f.movie_id.id : 'N/A';
            const movieTitle = isString(f.title) && f.title.length > 0 ? f.title.trimEnd() : 'N/A';
            originalText += `  ${movieId}: # ${movieTitle} Poster by ${creator} on MediUX.  https://mediux.pro/sets/${set.id}\n    url_poster: https://api.mediux.pro/assets/${posterId}\n    `;
            latestMovieTitle = latestMovieTitle + movieTitle + ', '; // Update the latest movie title
            console.log(`Title: ${f.title}\nPoster: ${posterId}\n`);
          }
          else if (f.movie_id_backdrop !== null) {
            const backdropId = f.fileType = 'backdrop' && f.id.length > 0 ? f.id : 'N/A';
            const movieId = isNonEmptyObject(f.movie_id_backdrop) ? f.movie_id_backdrop.id : 'N/A';
            originalText += `url_background: https://api.mediux.pro/assets/${backdropId}\n\n`
            console.log(`Backdrop: ${backdropId}\nMovie id: ${movieId}\n`);
          }
        }
      } else {
        console.log('No match found');
      }
    } catch (error) {
      console.error('Error fetching set:', error);
    }
  }

  // Stop the timer
  clearInterval(timerInterval);
  codeblock.innerText = "Processing complete!"; // Temporary message

  // Create a clickable link for copying the results
  const copyLink = document.createElement('a');
  copyLink.href = "#";
  copyLink.innerText = "Click here to copy the results";
  copyLink.style.color = 'blue'; // Styling for visibility
  copyLink.style.cursor = 'pointer';

  // Add click event listener to copy the results
  copyLink.addEventListener('click', async (e) => {
    e.preventDefault(); // Prevent default link behavior
    try {
      await navigator.clipboard.writeText(originalText);
      codeblock.innerText = originalText;
      color_change(button);
      showNotification("Results copied to clipboard!"); // Feedback to the user
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  });

  // Append the link to the codeblock
  codeblock.appendChild(copyLink);
  const totalTime = Math.floor((Date.now() - startTime) / 1000);
  console.log(`Total time taken: ${totalTime} seconds`);
}

function color_change(button) {
  button.classList.remove('bg-gray-500');
  button.classList.add('bg-green-500');

  // After 3 seconds, change it back to bg-gray-500
  setTimeout(() => {
    button.classList.remove('bg-green-500');
    button.classList.add('bg-gray-500');
  }, 3000); // 3000 milliseconds = 3 seconds
}

function fix_posters(codeblock) {
  const button = document.querySelector('#fpbutton');
  var yaml = codeblock.textContent;
  var posters = get_posters();
  var seasons = posters.filter((poster) => poster.title.includes("Season"));
  for (i in seasons) {
    var current = seasons.filter((season) => season.title.includes(`Season ${i}`));
    yaml = yaml + `      ${i}:\n        url_poster: https://api.mediux.pro/assets/${current[0].id}\n`;
  }
  codeblock.innerText = yaml;
  navigator.clipboard.writeText(yaml);
  showNotification("Results copied to clipboard!");
  color_change(button);
}

function fix_cards(codeblock) {
  const button = document.querySelector('#fcbutton');
  const str = codeblock.innerText;
  const regextest = /(seasons:\n)(        episodes:)/g;
  const regex = /(        episodes:)/g;
  let counter = 1;
  if (regextest.test(str)) {
    const modifiedStr = str.replace(regex, (match) => {
      const newLine = `      ${counter++}:\n`; // Create the new line with the counter
      return `${newLine}${match}`; // Return the new line followed by the match
    });
    codeblock.innerText = modifiedStr;
    navigator.clipboard.writeText(modifiedStr);
    showNotification("Results copied to clipboard!");
    color_change(button);
  }
}

function format_tv_yml(codeblock) {
  const button = document.querySelector('#fytvbutton');
  var yaml = codeblock.textContent;

  // Extract the set ID, title, and year from the HTML content
  const regexSet = /(\d+): # TVDB id for (.*?)\. Set by (.*?) on MediUX\. (https:\/\/mediux\.pro\/sets\/\d+)/;

  // Extract title and year from the HTML (looking for <h1 class="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl text-center lg:text-left">Mayfair Witches (2023)</h1>)
  const htmlTitle = document.querySelector('h1').textContent; // Mayfair Witches (2023)
  const yearMatch = htmlTitle.match(/\((\d{4})\)/); // Extract the year from the title (2023)
  const year = yearMatch ? yearMatch[1] : 'Unknown'; // If we can't find the year, default to 'Unknown'

  const match = yaml.match(regexSet);
  if (match) {
    const setId = match[1]; // Set ID (e.g., 413074)
    const title = match[2]; // TV Title (e.g., Mayfair Witches)
    const url = match[4]; // Set URL (https://mediux.pro/sets/20217)

    // Replace the header part with no extra space and use the correct title and year
    yaml = yaml.replace(regexSet, `# Posters from:\n# ${url}\n\nmetadata:\n\n  ${setId}: # ${title} (${year})`);
  }

  // Remove any leading spaces from the `# Posters from` line
  yaml = yaml.replace(/^\s+# Posters from:/m, `# Posters from:`);

  // Add quotes around URLs in the yaml content (url_poster and url_background)
  yaml = yaml.replace(/(url_poster|url_background): (https:\/\/api\.mediux\.pro\/assets\/[a-z0-9\-]+)/g, '$1: "$2"');

  // Now handle the seasons correctly and make sure the indentation is right
  yaml = yaml.replace(/(\d+):\n\s+url_poster: (https:\/\/api\.mediux\.pro\/assets\/[a-z0-9\-]+)\n/g, (match, season, url) => {
    return `      ${season}:\n        url_poster: "${url}"\n`;
  });

  // Update the code block with the formatted YAML
  codeblock.innerText = yaml;

  // Copy the formatted result to the clipboard
  navigator.clipboard.writeText(yaml);
  showNotification("YAML transformed and copied to clipboard!");
  color_change(button);
}

function format_movie_yml(codeblock) {
  const button = document.querySelector('#fymoviebutton');
  let yaml = codeblock.textContent;

  // Regex pattern to capture set URL from first entry
  const regexSet = /https:\/\/mediux\.pro\/sets\/\d+/;
  const urlMatch = yaml.match(regexSet);
  const url = urlMatch ? urlMatch[0] : null;

  if (url) {
    // Process all individual entries while preserving their data
    yaml = yaml.replace(
      /(\d+):\s*#\s*(.*?)\s*\((\d{4})\).*?(https:\/\/mediux\.pro\/sets\/\d+)/g,
      (match, id, title, year) => `${id}: # ${title.trim()} (${year})`
    );

    // Add consolidated header with set URL
    const header = `# Posters from:\n# ${url}\n\nmetadata:\n\n`;
    yaml = yaml.replace(/(^|\n)metadata:\n/g, '');
    yaml = header + yaml;

    // Format URLs and clean up YAML
    yaml = yaml
      .replace(/(url_poster|url_background): (https:\/\/api\.mediux\.pro\/assets\/\S+)/g, '$1: "$2"')
      .replace(/(\n\n)(\s+\n)/g, '\n\n') // Remove empty lines
      .replace(/\n{3,}/g, '\n\n');
  }

  // Update the code block with the formatted YAML
  codeblock.innerText = yaml;

  // Copy the formatted result to the clipboard
  navigator.clipboard.writeText(yaml);
  showNotification("YAML transformed and copied to clipboard!");
  color_change(button);
}

function start() {
  const codeblock = document.querySelector('code.whitespace-pre-wrap');
  const myDiv = document.querySelector('.flex.flex-col.space-y-1\\.5.text-center.sm\\:text-left');
  $(myDiv).children('h2, p').wrapAll('<div class="flex flex-row" style="align-items: center"><div id="myleftdiv" style="width: 25%; align: left"></div></div>');
  const myleftdiv = document.querySelector('#myleftdiv');

  var fcbutton = $('<button id="fcbutton" title="Fix missing season numbers in TitleCard YAML" class="duration-500 py-1 px-2 text-xs bg-gray-500 text-white rounded flex items-center justify-center focus:outline-none"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-puzzle w-5 h-5"><path d="M7 2h10"></path><path d="M5 6h14"></path><rect width="18" height="12" x="3" y="10" rx="2"></rect></svg></button>');
  fcbutton.on('click', () => fix_cards(codeblock));

  var fpbutton = $('<button id="fpbutton" title="Fix missing season posters YAML" class="duration-500 py-1 px-2 text-xs bg-gray-500 text-white rounded flex items-center justify-center focus:outline-none" style="margin-left:10px"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-image w-5 h-5"><path d="M2 7v10"></path><path d="M6 5v14"></path><rect width="12" height="18" x="10" y="3" rx="2"></rect></svg></button>');
  fpbutton.on('click', () => fix_posters(codeblock));

  var bsetbutton = $('<button id="bsetbutton" title="Generate YAML for associated boxset" class="duration-500 py-1 px-2 text-xs bg-gray-500 text-white rounded flex items-center justify-center focus:outline-none" style="margin-left:10px"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-box w-5 h-5"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M7 7v10"></path><path d="M11 7v10"></path><path d="m15 7 2 10"></path></svg></button>');
  bsetbutton.on('click', () => load_boxset(codeblock));

  var fytvbutton = $('<button id="fytvbutton" title="Format TV show YAML for Kometa" class="duration-500 py-1 px-2 text-xs bg-gray-500 text-white rounded flex items-center justify-center focus:outline-none" style="margin-left:10px"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-tv w-5 h-5"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg></button>');
  fytvbutton.on('click', () => format_tv_yml(codeblock));

  var fymoviebutton = $('<button id="fymoviebutton" title="Format Movie YAML for Kometa" class="duration-500 py-1 px-2 text-xs bg-gray-500 text-white rounded flex items-center justify-center focus:outline-none" style="margin-left:10px"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-film-reel w-5 h-5"><circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="2"></circle><line x1="12" y1="4" x2="12" y2="20"></line><line x1="4" y1="12" x2="20" y2="12"></line><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"></circle></svg></button>');
  fymoviebutton.on('click', () => format_movie_yml(codeblock));

  var wrappedButtons = $('<div id="extbuttons" class="flex flex-row" style="margin-top: 10px"></div>')
    .append(fcbutton)
    .append(fpbutton)
    .append(bsetbutton)
    .append(fytvbutton)
    .append(fymoviebutton);

  $(myleftdiv).append(wrappedButtons);
  $(myleftdiv).parent().append('<div style="width: 25%;"></div>');
}

/*--- waitForKeyElements():  A utility function, for Greasemonkey scripts,
  that detects and handles AJAXed content.
  Usage example:
      waitForKeyElements (
          "div.comments"
          , commentCallbackFunction
      );
      //--- Page-specific function to do what we want when the node is found.
      function commentCallbackFunction (jNode) {
          jNode.text ("This comment changed by waitForKeyElements().");
      }
  IMPORTANT: This function requires your script to have loaded jQuery.
*/
function waitForKeyElements(
  selectorTxt,    /* Required: The jQuery selector string that
                      specifies the desired element(s).
                  */
  actionFunction, /* Required: The code to run when elements are
                      found. It is passed a jNode to the matched
                      element.
                  */
  bWaitOnce,      /* Optional: If false, will continue to scan for
                      new elements even after the first match is
                      found.
                  */
  iframeSelector  /* Optional: If set, identifies the iframe to
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
    /*--- Found target node(s).  Go through each and act if they
        are new.
    */
    targetNodes.each(function () {
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
  }
  else {
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
  }
  else {
    //--- Set a timer, if needed.
    if (!timeControl) {
      timeControl = setInterval(function () {
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
