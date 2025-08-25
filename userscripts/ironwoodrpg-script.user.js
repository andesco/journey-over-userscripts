// ==UserScript==
// @name          Ironwood RPG Scripts
// @version       1.4.1
// @description   Calculate time remaining for active skill exp based on current exp and action stats, and display it on the skill page in Ironwood RPG
// @author        Journey Over
// @license       MIT
// @match         *://ironwoodrpg.com/*
// @grant         none
// @icon          https://www.google.com/s2/favicons?sz=64&domain=ironwoodrpg.com
// @homepageURL   https://github.com/StylusThemes/Userscripts
// @downloadURL   https://github.com/StylusThemes/Userscripts/raw/main/userscripts/ironwoodrpg-script.user.js
// @updateURL     https://github.com/StylusThemes/Userscripts/raw/main/userscripts/ironwoodrpg-script.user.js
// ==/UserScript==

/**
 * Converts a numerical amount of seconds to a textual timestamp formatted as
 * Years Months Days hh:mm:ss
 * @param {number} seconds
 * @returns {string}
 */
const convertSecondsToTimestamp = (seconds) => {
  const units = [{
      label: 'Y',
      value: 3600 * 24 * 365
    }, // Years
    {
      label: 'Mo',
      value: 3600 * 24 * 30
    }, // Months
    {
      label: 'D',
      value: 3600 * 24
    }, // Days
    {
      label: 'H',
      value: 3600
    }, // Hours
    {
      label: 'M',
      value: 60
    }, // Minutes
    {
      label: 'S',
      value: 1
    } // Seconds
  ];

  return units
    .map(({
      label,
      value
    }) => {
      const unit = Math.floor(seconds / value);
      seconds %= value;
      return unit > 0 || ['H', 'M', 'S'].includes(label) ?
        `${unit.toString().padStart(2, '0')}${label}` :
        '';
    })
    .filter(Boolean)
    .join(' ') || '00S'; // Ensure at least seconds are shown
};

/**
 * Calculates the estimated finish date and time based on the current time and the remaining seconds.
 * @param {number} secondsRemaining
 * @returns {string}
 */
const calculateFinishDate = (secondsRemaining) => {
  return new Date(Date.now() + secondsRemaining * 1000).toLocaleString();
};

/**
 * Parses various data from the HTML document.
 * @returns {Object}
 * @throws Will throw an error if parsing fails
 */
const parsePageData = () => {
  try {
    const skillPage = document.querySelector('skill-page');
    if (!skillPage) throw new Error("Could not find <skill-page> element in document");

    // Parse active skill exp
    const expElement = skillPage.querySelector('tracker-component .exp');
    if (!expElement) throw new Error("Could not find element with 'exp' class within <tracker-component>");

    const [currentExp, , requiredExp] = expElement.textContent.trim().toLowerCase().split(" ");
    const current = Number(currentExp.replaceAll(",", ""));
    const required = Number(requiredExp.replaceAll(",", ""));

    // Parse active action stats
    const actionsElement = skillPage.querySelector('actions-component button.active-link .stats');
    if (!actionsElement) throw new Error("Could not find action stats element within actions component");

    const exp = parseFloat(actionsElement.querySelector('.exp').textContent.trim().split(" ")[0]);
    const interval = parseFloat(actionsElement.querySelector('.interval').textContent.trim().slice(0, -1));

    // Parse loot data
    const lootName = skillPage.querySelector('.card .header .name')?.textContent.trim();
    if (!lootName) throw new Error("Could not find loot card in document");

    const timeElements = skillPage.querySelectorAll('.card .header .time .ng-star-inserted');
    let totalSeconds = 0;

    if (timeElements.length) {
      timeElements.forEach((el) => {
        const timeText = el.textContent.trim();
        const value = parseInt(timeText);

        if (timeText.endsWith('d')) {
          totalSeconds += value * 86400; // days to seconds
        } else if (timeText.endsWith('h')) {
          totalSeconds += value * 3600; // hours to seconds
        } else if (timeText.endsWith('m')) {
          totalSeconds += value * 60; // minutes to seconds
        } else if (timeText.endsWith('s')) {
          totalSeconds += value; // seconds
        }
      });
    } else {
      //console.warn("Loot timer elements not found. Defaulting to no loot data.");
    }

    return {
      exp: {
        current,
        required
      },
      actionStats: {
        exp,
        interval
      },
      lootName,
      totalSeconds,
      hasLootData: timeElements.length > 0
    };
  } catch (error) {
    if (!parsePageData.errorLogged) {
      console.error(`Could not parse page data: ${error.message}`);
      parsePageData.errorLogged = true;
    }
    throw error; // Rethrow to maintain existing error handling behavior
  }
};

const calculateActionsRequired = ({
  exp,
  actionStats
}) => {
  const expRemaining = exp.required - exp.current;
  return Math.ceil(expRemaining / actionStats.exp); // Round up to ensure the correct number of actions
};

const calculateTimeRemaining = ({
  actionsRequired,
  interval
}) => {
  const seconds = actionsRequired * interval;
  return {
    seconds,
    timestamp: convertSecondsToTimestamp(seconds)
  };
}

const renderStats = () => {
  const {
    exp,
    actionStats,
    lootName,
    totalSeconds,
    hasLootData
  } = parsePageData();
  const actionsRequired = calculateActionsRequired({
    exp,
    actionStats
  });
  const {
    seconds,
    timestamp
  } = calculateTimeRemaining({
    actionsRequired,
    interval: actionStats.interval
  });
  const finishDate = calculateFinishDate(seconds);

  // Create or replace rows for skill-related data
  createOrReplaceRow("actions-required", "Actions required:", String(actionsRequired));
  createOrReplaceRow("time-remaining", "Estimated Time remaining:", timestamp);
  createOrReplaceRow("finish-date", "Estimated Finish Date:", finishDate);

  if (hasLootData) {
    const lootFinishDate = calculateFinishDate(totalSeconds);
    createOrReplaceRow("loot-finish-date", `Loot (${lootName}) Estimated Finish Date:`, lootFinishDate);
  }
};

const createOrReplaceRow = (id, label, value) => {
  const rowElement = createRowElement(id);

  rowElement.innerHTML = `
    <p>${label}</p>
    <p style="padding-left: 8px; color: #BDA853;">${value}</p>
  `;

  const skillElement = document.querySelector("tracker-component .skill");
  if (!skillElement) throw new Error("Could not find skill element within tracker-component element in document");

  const existingRow = skillElement.querySelector(`#${id}`);
  existingRow ? existingRow.replaceWith(rowElement) : skillElement.appendChild(rowElement);
};

const createRowElement = (id) => {
  if (!id) throw new Error("No id provided for row element");

  const rowTemplate = document.querySelector("tracker-component .skill .row");
  if (!rowTemplate) throw new Error("Could not find template row element in document");

  const rowElement = rowTemplate.cloneNode();
  rowElement.replaceChildren();
  rowElement.setAttribute("id", id);

  Object.assign(rowElement.style, {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center"
  });

  return rowElement;
};

const main = () => {
  console.log('Ironwood RPG scripts loaded');

  let errorDisplayed = false;

  const mainInterval = setInterval(() => {
    try {
      renderStats();
      errorDisplayed = false;
    } catch (error) {
      if (!errorDisplayed) {
        console.error(error);
        errorDisplayed = true;
      }
    }
  }, 100);
};

// Entry-point
if (document.readyState !== "loading") {
  main();
} else {
  document.addEventListener("DOMContentLoaded", main);
}
