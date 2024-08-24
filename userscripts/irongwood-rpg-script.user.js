// ==UserScript==
// @name         Ironwood RPG Scripts
// @version      1.2
// @description  Calculate time remaining for active skill exp based on current exp and action stats, and display it on the skill page in Ironwood RPG
// @icon         https://www.google.com/s2/favicons?sz=64&domain=ironwoodrpg.com
// @match        *://ironwoodrpg.com/*
// @grant        none
// @require      https://code.jquery.com/jquery-3.6.4.min.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js
// @require      https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.20.0/matter.min.js
// ==/UserScript==

/**
 * Converts a numerical amount of seconds to a textual timestamp formatted as
 * Years Months Days hh:mm:ss
 * @param {number} seconds
 * @returns {string}
 */
const convertSecondsToTimestamp = (seconds) => {
  const years = Math.floor(seconds / (3600 * 24 * 365));
  seconds %= 3600 * 24 * 365;

  const months = Math.floor(seconds / (3600 * 24 * 30));
  seconds %= 3600 * 24 * 30;

  const days = Math.floor(seconds / (3600 * 24));
  seconds %= 3600 * 24;

  const hours = Math.floor(seconds / 3600).toString().padStart(2, "0");
  seconds %= 3600;

  const minutes = Math.floor(seconds / 60).toString().padStart(2, "0");
  const remainingSeconds = (seconds % 60).toFixed(0).toString().padStart(2, "0");

  let timestamp = "";

  if (years > 0) {
    timestamp += `${years}y `;
  }
  if (months > 0) {
    timestamp += `${months}m `;
  }
  if (days > 0) {
    timestamp += `${days}d `;
  }

  timestamp += `${hours}:${minutes}:${remainingSeconds}`;

  return timestamp.trim();
};

/**
 * Calculates the estimated finish date and time based on the current time and the remaining seconds.
 * @param {number} secondsRemaining
 * @returns {string}
 */
const calculateFinishDate = (secondsRemaining) => {
  const finishDate = new Date(Date.now() + secondsRemaining * 1000);
  return finishDate.toLocaleString();
};

// Parse active skill exp from HTML document
// @throws Will throw an error if parsing fails
const parseActiveSkillExp = () => {
  try {
    const skillPage = document.getElementsByTagName("skill-page")?.[0];

    if (!skillPage) {
      throw new Error("Could not find <skill-page> element in document");
    }

    const trackerComponent = skillPage.getElementsByTagName("tracker-component")?.[0];

    if (!trackerComponent) {
      throw new Error("Could not find <tracker-component> element within <skill-page> element in document");
    }

    const expElement = trackerComponent.getElementsByClassName("exp")?.[0];

    if (!expElement) {
      throw new Error("Could not find element with 'exp' class within <tracker-component> element in document");
    }

    const sanitizedExpString = expElement.textContent.trim().toLowerCase();
    const [currentExpString, , requiredExpString,] = sanitizedExpString.split(" ");
    const current = Number(currentExpString.replaceAll(",", ""));
    const required = Number(requiredExpString.replaceAll(",", ""));

    return { current, required };
  } catch (error) {
    throw new Error([
      "Could not parse active skill exp",
      `Reason = ${error.message}`
    ].join(", "));
  }
};

// Parse active action stats from HTML document
// @throws Will throw an error if parsing fails
const parseActiveActionStats = () => {
  try {
    const skillPage = document.getElementsByTagName("skill-page")?.[0];

    if (!skillPage) {
      throw new Error("Could not find <skill-page> element in document");
    }

    const actionsComponent = document.getElementsByTagName("actions-component")?.[0];

    if (!actionsComponent) {
      throw new Error("Could not find <actions-component> element within <skill-page> element in document");
    }

    const actionsElement = actionsComponent.querySelector("button.active-link");

    if (!actionsElement) {
      throw new Error("Could not find action element within <actions-component> element in document");
    }

    const actionStatsElement = actionsElement.getElementsByClassName("stats")?.[0];

    if (!actionStatsElement) {
      throw new Error("Could not find action stats element within actions element in document");
    }

    const expElement = actionStatsElement.getElementsByClassName("exp")?.[0];

    if (!expElement) {
      throw new Error("Could not find exp element within action stats element in document");
    }

    const intervalElement = actionStatsElement.getElementsByClassName("interval")?.[0];

    if (!intervalElement) {
      throw new Error("Could not find interval element within action stats element in document");
    }

    const exp = expElement.textContent.trim().split(" ")[0];
    const interval = intervalElement.textContent.trim().slice(0, -1);

    return {
      exp: parseFloat(exp),
      interval: parseFloat(interval)
    };
  } catch (error) {
    throw new Error([
      "Could not parse active action stats",
      `Reason = ${error.message}`
    ].join(", "));
  }
};

// Parse loot name and timer from HTML document
// @throws Will throw an error if parsing fails
const parseLootData = () => {
  try {
    const skillPage = document.querySelector("skill-page");

    if (!skillPage) {
      throw new Error("Could not find <skill-page> element in document");
    }

    const lootCard = skillPage.querySelector(".card .header .name");

    if (!lootCard) {
      throw new Error("Could not find loot card in document");
    }

    const lootName = lootCard.textContent.trim();

    const timeElements = skillPage.querySelectorAll(".card .header .time .ng-star-inserted");

    if (!timeElements.length) {
      throw new Error("Could not find loot timer elements in document");
    }

    let totalSeconds = 0;

    timeElements.forEach((el) => {
      const timeText = el.textContent.trim();

      if (timeText.endsWith('d')) {
        totalSeconds += parseInt(timeText) * 86400; // days to seconds
      } else if (timeText.endsWith('h')) {
        totalSeconds += parseInt(timeText) * 3600; // hours to seconds
      } else if (timeText.endsWith('m')) {
        totalSeconds += parseInt(timeText) * 60; // minutes to seconds
      } else if (timeText.endsWith('s')) {
        totalSeconds += parseInt(timeText); // seconds
      }
    });

    return { lootName, totalSeconds };
  } catch (error) {
    throw new Error([
      "Could not parse loot data",
      `Reason = ${error.message}`
    ].join(", "));
  }
};

const calculateActionsRequired = ({ exp, actionStats }) => {
  const expRemaining = exp.required - exp.current;
  const actionsRequired = Math.ceil(expRemaining / actionStats.exp); // Round up to ensure the correct number of actions
  return actionsRequired;
};

const calculateTimeRemaining = ({ actionsRequired, interval }) => {
  const seconds = actionsRequired * interval;
  return {
    seconds,
    timestamp: convertSecondsToTimestamp(seconds)
  };
}

const renderStats = () => {
  const exp = parseActiveSkillExp();
  const actionStats = parseActiveActionStats();
  const actionsRequired = calculateActionsRequired({ exp, actionStats });
  const { seconds, timestamp } = calculateTimeRemaining({ actionsRequired, interval: actionStats.interval });
  const finishDate = calculateFinishDate(seconds);

  // Create or replace rows for skill-related data
  createOrReplaceRow("actions-required", "Actions required:", String(actionsRequired));
  createOrReplaceRow("time-remaining", "Estimated Time remaining:", timestamp);
  createOrReplaceRow("finish-date", "Estimated Finish Date:", finishDate);

  try {
    const { lootName, totalSeconds } = parseLootData();
    const lootFinishDate = calculateFinishDate(totalSeconds);
    createOrReplaceRow("loot-finish-date", `Loot (${lootName}) Estimated Finish Date:`, lootFinishDate);
  } catch (error) {
    console.error(error.message);
  }
};

const createOrReplaceRow = (id, label, value) => {
  const rowElement = createRowElement(id);

  rowElement.appendChild((() => {
    const labelElement = document.createElement("p");
    labelElement.textContent = label;
    return labelElement;
  })());

  rowElement.appendChild((() => {
    const valueElement = document.createElement("p");
    valueElement.style.paddingLeft = "8px";
    valueElement.style.color = "#BDA853";
    valueElement.textContent = value;
    return valueElement;
  })());

  const skillElement = document.querySelector("tracker-component .skill");

  if (!skillElement) {
    throw new Error("Could not find skill element within tracker-component element in document");
  }

  const existingRow = skillElement.querySelector(`#${id}`);

  if (existingRow) {
    existingRow.replaceWith(rowElement);
  } else {
    skillElement.appendChild(rowElement);
  }
};


const createRowElement = (id) => {
  if (!id) {
    throw new Error("No id provided for row element");
  }

  const rowTemplate = document.querySelector("tracker-component .skill .row");

  if (!rowTemplate) {
    throw new Error("Could not find template row element in document");
  }

  const rowElement = rowTemplate.cloneNode();

  rowElement.replaceChildren();

  rowElement.setAttribute("id", id);

  rowElement.style.display = "flex";
  rowElement.style.flexDirection = "flex-row";
  rowElement.style.justifyContent = "flex-start";
  rowElement.style.alignItems = "center";

  return rowElement;
}

const main = () => {
  console.log('ironwood rpg scripts loaded');

  let errorDisplayed = false;

  let mainInterval = setInterval(() => {
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
  document.addEventListener("DOMContentLoaded", () => {
    main();
  });
}
