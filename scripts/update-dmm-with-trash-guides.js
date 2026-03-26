import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration
const BASE_URL = "https://raw.githubusercontent.com/TRaSH-Guides/Guides/master/docs/json";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const OUTPUT_FILE = path.join(__dirname, '../libs/dmm/button-data.js');

const FILES = {
    // Radarr
    'Movies Remux Tier 01': `${BASE_URL}/radarr/cf/remux-tier-01.json`,
    'Movies Remux Tier 02': `${BASE_URL}/radarr/cf/remux-tier-02.json`,
    'Movies WEB Tier 01': `${BASE_URL}/radarr/cf/web-tier-01.json`,
    'Movies WEB Tier 02': `${BASE_URL}/radarr/cf/web-tier-02.json`,
    'Movies WEB Tier 03': `${BASE_URL}/radarr/cf/web-tier-03.json`,
    'Movies HD Bluray Tier 01': `${BASE_URL}/radarr/cf/hd-bluray-tier-01.json`,
    'Movies HD Bluray Tier 02': `${BASE_URL}/radarr/cf/hd-bluray-tier-02.json`,
    'Bad Releases': `${BASE_URL}/radarr/cf/lq.json`,
    
    // Sonarr
    'Shows Remux Tier 01': `${BASE_URL}/sonarr/cf/remux-tier-01.json`,
    'Shows Remux Tier 02': `${BASE_URL}/sonarr/cf/remux-tier-02.json`,
    'Shows WEB Tier 01': `${BASE_URL}/sonarr/cf/web-tier-01.json`,
    'Shows WEB Tier 02': `${BASE_URL}/sonarr/cf/web-tier-02.json`,
    'Shows WEB Tier 03': `${BASE_URL}/sonarr/cf/web-tier-03.json`,
    'Shows HD Bluray Tier 01': `${BASE_URL}/sonarr/cf/hd-bluray-tier-01.json`,
    'Shows HD Bluray Tier 02': `${BASE_URL}/sonarr/cf/hd-bluray-tier-02.json`,
    'Anime BD Tier 01': `${BASE_URL}/sonarr/cf/anime-bd-tier-01.json`,
    'Anime WEB Tier 01': `${BASE_URL}/sonarr/cf/anime-web-tier-01.json`,
};

function cleanRegex(regex) {
    regex = regex.trim();
    if (regex.startsWith('^')) regex = regex.substring(1);
    if (regex.endsWith('$')) regex = regex.substring(0, regex.length - 1);
    
    // Remove outer parens if simple wrapper
    if (regex.startsWith('(') && regex.endsWith(')')) {
        let count = 0;
        let balanced = true;
        for (let i = 0; i < regex.length; i++) {
            if (regex[i] === '(') count++;
            else if (regex[i] === ')') count--;
            if (count === 0 && i < regex.length - 1) {
                balanced = false;
                break;
            }
        }
        if (balanced) {
            regex = regex.substring(1, regex.length - 1);
        }
    }
    return regex;
}

async function fetchAndParse(url) {
    console.log(`Fetching ${url}...`);
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        
        const groups = new Set();
        if (data.specifications) {
            for (const spec of data.specifications) {
                const impl = spec.implementation;
                if (impl === 'ReleaseGroupSpecification' || impl === 'ReleaseTitleSpecification') {
                    const val = spec.fields && spec.fields.value;
                    if (val) {
                        const cleaned = cleanRegex(val);
                        if (cleaned.includes('|') && !cleaned.includes('(')) {
                            cleaned.split('|').forEach(part => groups.add(part.trim()));
                        } else {
                            groups.add(cleaned);
                        }
                    }
                }
            }
        }
        return groups;
    } catch (e) {
        console.error(`Error fetching ${url}: ${e}`);
        return new Set();
    }
}

function formatRegexGroup(groups) {
    const sortedGroups = Array.from(groups).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    const uniqueGroups = [];
    const seen = new Set();
    
    for (const g of sortedGroups) {
        const lower = g.toLowerCase();
        if (!seen.has(lower) && g) {
            uniqueGroups.push(g);
            seen.add(lower);
        }
    }
    return uniqueGroups.join("|");
}

function getButtonObj(name, groups) {
    let regexInner = formatRegexGroup(groups);
    // Double escape backslashes for JS string output
    regexInner = regexInner.replace(/\\/g, '\\\\');
    // We construct a string that is a valid JS regex string
    // e.g. "\\b(Group)\\b"
    // Since we are writing to a file, we need to escape the backslashes so they appear as literals in the file
    const regex = `\\\\b(${regexInner})\\\\b`;
    return `      {
        name: "${name}",
        value: "${regex}"
      },`;
}

function getNotTrashObj(groups) {
    let regexInner = formatRegexGroup(groups);
    regexInner = regexInner.replace(/\\/g, '\\\\');
    return `      {
        name: "Not Trash Recommended",
        value: "^((?!\\\\b(${regexInner})\\\\b).)*$"
      }`;
}

async function main() {
    const dataMap = {};
    
    for (const [key, url] of Object.entries(FILES)) {
        dataMap[key] = await fetchAndParse(url);
    }
    
    // Helper to combine sets
    const combine = (keys) => {
        const result = new Set();
        for (const key of keys) {
            if (dataMap[key]) {
                for (const item of dataMap[key]) result.add(item);
            }
        }
        return result;
    };

    // Build Combined Lists
    const combinedMovies = combine([
        'Movies Remux Tier 01', 'Movies Remux Tier 02', 
        'Movies WEB Tier 01', 'Movies WEB Tier 02', 'Movies WEB Tier 03',
        'Movies HD Bluray Tier 01', 'Movies HD Bluray Tier 02'
    ]);
    
    const combinedShows = combine([
        'Shows Remux Tier 01', 'Shows Remux Tier 02',
        'Shows WEB Tier 01', 'Shows WEB Tier 02', 'Shows WEB Tier 03',
        'Shows HD Bluray Tier 01', 'Shows HD Bluray Tier 02',
        'Anime BD Tier 01', 'Anime WEB Tier 01'
    ]);
    
    const combinedRemux = combine([
        'Movies Remux Tier 01', 'Movies Remux Tier 02',
        'Shows Remux Tier 01', 'Shows Remux Tier 02',
        'Anime BD Tier 01'
    ]);
    
    const combinedWeb = combine([
        'Movies WEB Tier 01', 'Movies WEB Tier 02', 'Movies WEB Tier 03',
        'Shows WEB Tier 01', 'Shows WEB Tier 02', 'Shows WEB Tier 03',
        'Anime WEB Tier 01'
    ]);
    
    const combinedBluray = combine([
        'Movies HD Bluray Tier 01', 'Movies HD Bluray Tier 02',
        'Shows HD Bluray Tier 01', 'Shows HD Bluray Tier 02'
    ]);

    const highestTier = combine([
        'Movies Remux Tier 01', 'Movies WEB Tier 01', 'Movies HD Bluray Tier 01',
        'Shows Remux Tier 01', 'Shows WEB Tier 01', 'Shows HD Bluray Tier 01',
        'Anime BD Tier 01', 'Anime WEB Tier 01'
    ]);
    
    const allTrash = new Set([...combinedMovies, ...combinedShows]);
    const badReleases = dataMap['Bad Releases'] || new Set();

    // Store computed sets back in map for easy access
    dataMap['Combined Movies'] = combinedMovies;
    dataMap['Combined Shows'] = combinedShows;
    dataMap['Combined Remux Tiers'] = combinedRemux;
    dataMap['Combined WEB Tiers'] = combinedWeb;
    dataMap['Combined HD Bluray Tiers'] = combinedBluray;
    dataMap['Highest Tier Releases'] = highestTier;
    dataMap['All Trash Recommended'] = allTrash;
    dataMap['Bad Releases'] = badReleases;

    const output = [];
    output.push("window.DMM_BUTTON_DATA = [");
    output.push("  {");
    output.push("    name: \"Combined\",");
    output.push("    buttonData: [");
    output.push(getButtonObj("Highest Tier Releases", highestTier));
    output.push(getButtonObj("All Trash Recommended", allTrash));
    output.push(getButtonObj("Bad Releases", badReleases));
    output.push(getNotTrashObj(allTrash));
    output.push("    ],");
    output.push("  },");
    
    output.push("  {");
    output.push("    name: \"Shows\",");
    output.push("    buttonData: [");
    output.push(getButtonObj("Combined Shows", combinedShows));
    output.push(getButtonObj("Combined Remux Tiers", combinedRemux));
    output.push(getButtonObj("Combined HD Bluray Tiers", combinedBluray));
    output.push(getButtonObj("Combined WEB Tiers", combinedWeb));
    output.push(getButtonObj("Remux Tier 01", dataMap['Shows Remux Tier 01']));
    output.push(getButtonObj("Remux Tier 02", dataMap['Shows Remux Tier 02']));
    output.push(getButtonObj("HD Bluray Tier 01", dataMap['Shows HD Bluray Tier 01']));
    output.push(getButtonObj("HD Bluray Tier 02", dataMap['Shows HD Bluray Tier 02']));
    output.push(getButtonObj("WEB Tier 01", dataMap['Shows WEB Tier 01']));
    output.push(getButtonObj("WEB Tier 02", dataMap['Shows WEB Tier 02']));
    output.push(getButtonObj("WEB Tier 03", dataMap['Shows WEB Tier 03']));
    output.push("    ],");
    output.push("  },");
    
    output.push("  {");
    output.push("    name: \"Movies\",");
    output.push("    buttonData: [");
    output.push(getButtonObj("Combined Movies", combinedMovies));
    output.push(getButtonObj("Combined Remux Tiers", combinedRemux));
    output.push(getButtonObj("Combined HD Bluray Tiers", combinedBluray));
    output.push(getButtonObj("Combined WEB Tiers", combinedWeb));
    output.push(getButtonObj("Remux Tier 01", dataMap['Movies Remux Tier 01']));
    output.push(getButtonObj("Remux Tier 02", dataMap['Movies Remux Tier 02']));
    output.push(getButtonObj("HD Bluray Tier 01", dataMap['Movies HD Bluray Tier 01']));
    output.push(getButtonObj("HD Bluray Tier 02", dataMap['Movies HD Bluray Tier 02']));
    output.push(getButtonObj("WEB Tier 01", dataMap['Movies WEB Tier 01']));
    output.push(getButtonObj("WEB Tier 02", dataMap['Movies WEB Tier 02']));
    output.push(getButtonObj("WEB Tier 03", dataMap['Movies WEB Tier 03']));
    output.push("    ],");
    output.push("  }");
    output.push("];");
    
    const content = output.join("\n");
    console.log(`Writing to ${OUTPUT_FILE}...`);
    fs.writeFileSync(OUTPUT_FILE, content);
    console.log("Done!");
}

main();
