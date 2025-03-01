import fs from 'fs';
import axios from 'axios';
import { countries, languages } from 'countries-list';
import i18nIsoCountries from 'i18n-iso-countries';
import { createRequire } from 'module';
import process from 'node:process';
import readline from 'readline';

const require = createRequire(import.meta.url);
const enLocale = require('i18n-iso-countries/langs/en.json');
i18nIsoCountries.registerLocale(enLocale);

const BASE_URL = "https://de1.api.radio-browser.info/json";
const WORLD_ATLAS_URL = "https://unpkg.com/world-atlas@2/countries-110m.json";
const OUTPUT_FILE = "stations.json";
const STATIONS_PER_COUNTRY = 25;

/**
 * Build an object { "US": ["english"], "CA": ["english","french"], ... }
 * from `countries-list`. We'll use this to:
 * - identify which countries speak English
 * - do weighted station picking based on the number of official languages
 */
const OFFICIAL_LANGUAGES_BY_CC = {};
Object.keys(countries).forEach((cc) => {
  const langCodes = countries[cc].languages;
  const langNames = langCodes.map((code) => {
    const obj = languages[code];
    return obj ? obj.name.toLowerCase() : code; // fallback if unknown
  });
  OFFICIAL_LANGUAGES_BY_CC[cc] = langNames;
});

/**
 * Local genres to prioritize in certain countries (optional).
 */
const LOCAL_GENRES = {
  "DE": ["schlager", "volksmusik"],
  "FR": ["chanson", "francophone"],
  "ES": ["flamenco", "latino"],
  "RU": ["russian folk", "russian pop"],
  "JP": ["enka", "jpop"],
  "KR": ["kpop", "trot"],
  "IT": ["canzone italiana"],
  "BR": ["samba", "bossa nova"],
  "IN": ["bollywood", "hindustani"],
  "CN": ["mandopop"]
};

/** 
 * Keywords typically associated with English or Anglo pop music.
 * We'll filter these out for countries that do *not* officially speak English.
 */
const ENGLISH_MUSIC_KEYWORDS = [
  "top 40", "hits", "classic rock", "pop", "alternative",
  "edm", "rnb", "hip hop", "trap", "house", "rock"
];

/**
 * Weighted distribution for multiple official languages in a country:
 * - 1 language => 100%
 * - 2 langs => 90%, 10%
 * - 3 langs => 80%, 10%, 10%
 * - 4 langs => 70%, 10%, 10%, 10%
 * - 5+ langs => 70% main, 30% split equally among the rest
 */
function getLanguageWeights(langs) {
  const count = langs.length;
  if (count === 1) return { [langs[0]]: 1.0 };

  let mainWeight = 0.7;
  switch (count) {
    case 2: mainWeight = 0.9; break;
    case 3: mainWeight = 0.8; break;
    case 4: mainWeight = 0.7; break;
    // For 5 or more, we keep main = 0.7
  }

  const weights = {};
  const mainLang = langs[0];
  weights[mainLang] = mainWeight;

  const remaining = 1.0 - mainWeight;
  const otherCount = count - 1;
  const eachOther = remaining / otherCount;

  for (let i = 1; i < langs.length; i++) {
    weights[langs[i]] = eachOther;
  }
  return weights;
}

/**
 * We’ll build atlasMap[alpha2] = "Country Name" from the world-atlas TopoJSON
 * (e.g. atlasMap["RU"] = "Russia").
 */
const atlasMap = {};

/**
 * Load the world-atlas data from unpkg, parse the countries geometry,
 * for each "feature.id" (numeric ISO) do numericToAlpha2 => store in atlasMap
 */
async function loadAtlasMap() {
  console.log(`\nFetching world-atlas data from: ${WORLD_ATLAS_URL}`);
  const { data } = await axios.get(WORLD_ATLAS_URL);

  if (!data.objects || !data.objects.countries || !data.objects.countries.geometries) {
    throw new Error("Unexpected format in world-atlas data!");
  }

  for (const feature of data.objects.countries.geometries) {
    const numericCode = feature.id;               // e.g. "643"
    const countryName = feature.properties?.name; // e.g. "Russia"
    if (!numericCode || !countryName) continue;

    const alpha2 = i18nIsoCountries.numericToAlpha2(numericCode);
    if (alpha2) {
      atlasMap[alpha2.toUpperCase()] = countryName; // store uppercase for consistency
    }
  }

  console.log(`Built atlasMap with ${Object.keys(atlasMap).length} entries.\n`);
}

/**
 * Fetch all stations in one request (limit=500000).
 */
async function fetchAllStations() {
  const url = `${BASE_URL}/stations/search?limit=500000&hidebroken=true`;
  console.log(`\nFetching all stations from: ${url}`);
  const response = await axios.get(url);
  return response.data;
}

/**
 * Group stations by uppercase country code ("US", "FR", etc.).
 */
function groupByCountryCode(stations) {
  const grouped = {};
  for (const station of stations) {
    let cc = station.countrycode ? station.countrycode.trim().toUpperCase() : "";
    if (!cc) cc = "UNKNOWN";
    if (!grouped[cc]) grouped[cc] = [];
    grouped[cc].push(station);
  }
  return grouped;
}

/**
 * Rescue stations from "UNKNOWN" if their .country includes certain keywords (optional).
 */
function reassignUnknownStations(grouped) {
  const unknownList = grouped["UNKNOWN"] || [];
  let rescuedCount = 0;
  const remainUnknown = [];

  for (const st of unknownList) {
    const c = st.country?.toLowerCase() || "";
    if (c.includes("russia")) {
      grouped["RU"] = grouped["RU"] || [];
      grouped["RU"].push(st);
      rescuedCount++;
    } else if (c.includes("united states")) {
      grouped["US"] = grouped["US"] || [];
      grouped["US"].push(st);
      rescuedCount++;
    } else if (c.includes("poland")) {
      grouped["PL"] = grouped["PL"] || [];
      grouped["PL"].push(st);
      rescuedCount++;
    } else {
      remainUnknown.push(st);
    }
  }

  grouped["UNKNOWN"] = remainUnknown;
  console.log(`Reassigned ${rescuedCount} stations from UNKNOWN -> recognized codes.\n`);
}

/**
 * Filter out English music if the country does NOT officially speak English.
 * We'll look at station name, tags, etc., matching known English keywords.
 */
function filterStationsByMusicLanguage(stations, countryCode) {
  // If the official languages include "english", then skip these checks:
  const officialLangs = OFFICIAL_LANGUAGES_BY_CC[countryCode] || [];
  const isEnglishSpeaking = officialLangs.includes("english");

  return stations.filter((station) => {
    if (!station.language || !station.tags) {
      return false; // missing data => skip
    }

    const stationLang = station.language.toLowerCase();
    const stationTags = station.tags.toLowerCase();
    const stationName = station.name.toLowerCase();

    if (isEnglishSpeaking) {
      // If country is English-speaking, don't exclude on English basis
      return true;
    }

    // Exclude if "english" is found in station language or tags
    if (stationLang.includes("english") || stationTags.includes("english")) {
      return false;
    }

    // Exclude if name/tags contain typical English pop/rock keywords
    if (ENGLISH_MUSIC_KEYWORDS.some((kw) => stationName.includes(kw) || stationTags.includes(kw))) {
      return false;
    }

    return true;
  });
}

/**
 * Sort stations so local genres appear first (for countries that have them).
 */
function prioritizeLocalGenres(stations, cc) {
  const localGenres = LOCAL_GENRES[cc] || [];
  if (localGenres.length === 0) return stations;

  return stations.sort((a, b) => {
    const aTags = a.tags.toLowerCase();
    const bTags = b.tags.toLowerCase();

    const aLocal = localGenres.some(g => aTags.includes(g));
    const bLocal = localGenres.some(g => bTags.includes(g));

    // If b is local & a is not, b should come first => bLocal - aLocal
    return bLocal - aLocal;
  });
}

/**
 * For each country, we:
 *  1) Bucket stations by their single official language (if any).
 *  2) Use the Weighted distribution to pick from each language bucket.
 *  3) Fill leftover from the main language bucket if needed.
 *  4) Return up to 25.
 */
function pickWeightedStationsForCountry(cc, stationList) {
  const officialLangs = OFFICIAL_LANGUAGES_BY_CC[cc] || [];
  if (officialLangs.length === 0) {
    // No official data => just take first 25
    return stationList.slice(0, STATIONS_PER_COUNTRY);
  }

  // Create a bucket for each official language
  const buckets = {};
  for (const lang of officialLangs) {
    buckets[lang] = [];
  }

  // Put stations into the correct bucket only if they have EXACTLY 1 language
  // that matches an official language for the country.
  for (const st of stationList) {
    const splitted = st.language.toLowerCase().split(",").map(s => s.trim());
    if (splitted.length === 1 && officialLangs.includes(splitted[0])) {
      buckets[splitted[0]].push(st);
    }
  }

  // Sort each bucket so local genres appear first
  for (const lang of officialLangs) {
    buckets[lang] = prioritizeLocalGenres(buckets[lang], cc);
  }

  // Weighted distribution
  const weights = getLanguageWeights(officialLangs);
  const selected = [];

  // Gather stations from each language bucket according to the weighting
  for (const lang of officialLangs) {
    const portion = Math.floor(weights[lang] * STATIONS_PER_COUNTRY);
    const subset = buckets[lang].slice(0, portion);
    selected.push(...subset);
  }

  // If we still have fewer than 25, fill from the "main" language bucket
  let missing = STATIONS_PER_COUNTRY - selected.length;
  if (missing > 0) {
    const mainLang = officialLangs[0];
    const alreadyChosenCount = selected.filter(
      (s) => s.language.toLowerCase().trim() === mainLang
    ).length;
    const leftover = buckets[mainLang].slice(alreadyChosenCount);
    selected.push(...leftover.slice(0, missing));
  }

  // Return up to 25
  return selected.slice(0, STATIONS_PER_COUNTRY);
}

// NEW: Function to test a station URL for availability and CORS compliance
async function simulateBrowserEnvironment(url) {
  // For HTTP URLs, try the HTTPS version since browsers will upgrade
  const testUrl = url.toLowerCase().startsWith('http:') 
    ? url.replace(/^http:/i, 'https:') 
    : url;

  try {
    const response = await axios.head(testUrl, {
      headers: { Origin: 'https://example.com' },
      timeout: 5000
    });
    const allowOrigin = response.headers['access-control-allow-origin'];
    const ctype = response.headers['content-type'] || "";

    if (response.status < 400 &&
        (allowOrigin === '*' || allowOrigin === 'https://example.com') &&
        ctype.toLowerCase().startsWith("audio/")) {
      return true;
    }
  } catch {
    // HEAD failed, try GET with streaming
    try {
      const response = await axios.get(testUrl, {
        headers: { Origin: 'https://example.com' },
        timeout: 5000,
        responseType: 'stream'
      });
      const allowOrigin = response.headers['access-control-allow-origin'];
      const ctype = response.headers['content-type'] || "";
      if (response.status < 400 &&
          (allowOrigin === '*' || allowOrigin === 'https://example.com') &&
          ctype.toLowerCase().startsWith("audio/")) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}

// Modify testStation to skip stations failing browser checks
async function testStation(station) {
  // NEW: Browser-like check first
  const browserOk = await simulateBrowserEnvironment(station.url);
  if (!browserOk) {
    return false;
  }

  try {
    // Attempt a HEAD request first
    const response = await axios.head(station.url, { timeout: 5000 });
    if (response.status < 400) {
      return true;
    }
  } catch {
    try {
      const response = await axios.get(station.url, { timeout: 5000, responseType: 'stream' });
      if (response.status < 400) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}

// NEW: Function to prompt user for a country code if not provided via CLI
async function promptCountryCode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  return new Promise(resolve => {
    rl.question('Enter country code (or press Enter to process all countries): ', answer => {
      rl.close();
      resolve(answer.trim().toUpperCase());
    });
  });
}

// NEW: Function to pick up to 25 stations per country
async function pickUpTo25PerCountry(grouped) {
  const finalData = {};

  for (const [cc, stationList] of Object.entries(grouped)) {
    // 1) Filter out English music for non-English countries
    const filtered = filterStationsByMusicLanguage(stationList, cc);
    if (!filtered.length) continue;

    console.log(`\nProcessing country ${cc} with ${stationList.length} stations.`);
    
    // 2) Weighted station picking
    const candidates = pickWeightedStationsForCountry(cc, filtered);
    const extraCandidates = filtered.filter(st => !candidates.includes(st));
    const allCandidates = [...candidates, ...extraCandidates];

    // 3) Test each candidate in browser-simulated environment
    const finalStations = [];
    for (const candidate of allCandidates) {
      if (finalStations.length >= STATIONS_PER_COUNTRY) break;
      const working = await testStation(candidate);
      if (working) {
        finalStations.push(candidate);
        console.log(`Country ${cc}: ${finalStations.length} working stations found so far.`);
      } else {
        console.log(`Station "${candidate.name}" failed testing. Searching for alternative.`);
      }
    }
    if (!finalStations.length) continue;

    console.log(`Finished processing ${cc}: ${finalStations.length} stations selected.`);

    // 4) Atlas-based name lookup or fallback
    let atlasName = atlasMap[cc];
    if (!atlasName && countries[cc]) atlasName = countries[cc].name;
    if (!atlasName) atlasName = cc;

    // Construct final station objects
    finalData[atlasName] = finalStations.map(st => ({
      name: st.name,
      url: st.url_resolved,
      country: atlasName,
      countrycode: st.countrycode,
      language: st.language,
      bitrate: st.bitrate
    }));
  }

  return finalData;
}

// In main(), await the new asynchronous station picking step:
async function main() {
  try {
    // Step A: Build atlasMap from world-atlas data
    await loadAtlasMap();

    // Step B: Fetch all radio stations
    console.log("Fetching massive list of all stations...");
    const allStations = await fetchAllStations();
    console.log(`Fetched ${allStations.length} stations.\n`);

    // Step C: Group by country code (changed to let so we can reassign)
    let grouped = groupByCountryCode(allStations);
    console.log("Grouping by uppercase countrycode...");

    // Step D: Reassign some "UNKNOWN" stations if possible
    console.log("Reassigning UNKNOWN stations...");
    reassignUnknownStations(grouped);

    // NEW: Get country code either from CLI or by prompting the user
    let countryCode = process.argv[2] ? process.argv[2].toUpperCase() : await promptCountryCode();
    if (countryCode) {
      if (!grouped[countryCode] || !grouped[countryCode].length) {
        console.log(`No stations available for country code: ${countryCode}`);
        process.exit(1);
      }
      console.log(`Testing mode: Filtering stations for country code ${countryCode}`);
      grouped = { [countryCode]: grouped[countryCode] };
    }

    // Step E: Do final picking + filtering + rename to atlas-based name (async testing)
    console.log("Filtering, testing & picking stations per country...");
    const finalData = await pickUpTo25PerCountry(grouped);

    // Step F: Write out JSON
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalData, null, 2));
    console.log(`\n✅ Saved station list to "${OUTPUT_FILE}"\n`);

    // Step G: Debug info (unchanged)
    let totalCountries = 0, totalStations = 0;
    console.log("--- Station Counts by Country (finalData) ---");
    for (const [countryName, stations] of Object.entries(finalData)) {
      console.log(`${countryName}: ${stations.length}`);
      totalCountries++;
      totalStations += stations.length;
    }
    console.log(`\nTotal countries in finalData: ${totalCountries}`);
    console.log(`Total stations in finalData: ${totalStations}\n`);
  } catch (err) {
    console.error("Failed to generate station list:", err.message);
    console.error(err);
  }
}

main();
