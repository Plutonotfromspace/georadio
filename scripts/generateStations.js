import fs from 'fs';
import axios from 'axios';
import { countries, languages } from 'countries-list';
import i18nIsoCountries from 'i18n-iso-countries';
import { createRequire } from 'module';

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

/**
 * This is where we:
 *  - Filter out English music (for non-English-speaking countries).
 *  - Do the weighted station picking.
 *  - Overwrite the final 'country' name with the atlas name from world-atlas (if found).
 *  - Use that same atlas name as the key in the output JSON.
 */
function pickUpTo25PerCountry(grouped) {
  const finalData = {};

  for (const [cc, stationList] of Object.entries(grouped)) {
    if (!stationList.length) continue;

    // 1) Filter out English music for non-English countries
    const filtered = filterStationsByMusicLanguage(stationList, cc);
    if (!filtered.length) continue;

    // 2) Weighted station picking
    const chosen = pickWeightedStationsForCountry(cc, filtered);
    if (!chosen.length) continue;

    // 3) Atlas-based name lookup (fallback to countries-list or raw cc if missing)
    //    Example: atlasMap["RU"] = "Russia"
    let atlasName = atlasMap[cc];
    if (!atlasName) {
      // If we didn't find anything in world-atlas for this cc,
      // fallback to `countries-list` name if present:
      if (countries[cc]) {
        atlasName = countries[cc].name; // e.g. "Russian Federation"
      } else {
        atlasName = cc; // last fallback
      }
    }

    // 4) Construct final station objects
    const finalStations = chosen.map(st => ({
      name: st.name,
      url: st.url_resolved,
      country: atlasName,  // Overwrite with atlas-based name
      countrycode: st.countrycode,
      language: st.language,
      bitrate: st.bitrate
    }));

    // 5) Place them under finalData[atlasName]
    finalData[atlasName] = finalStations;
  }

  return finalData;
}

/**
 * MAIN
 */
async function main() {
  try {
    // Step A: Build atlasMap from world-atlas data
    await loadAtlasMap();

    // Step B: Fetch all radio stations
    console.log("Fetching massive list of all stations...");
    const allStations = await fetchAllStations();
    console.log(`Fetched ${allStations.length} stations.\n`);

    // Step C: Group by country code
    console.log("Grouping by uppercase countrycode...");
    const grouped = groupByCountryCode(allStations);

    // Step D: Reassign some "UNKNOWN" stations if possible
    console.log("Reassigning UNKNOWN stations...");
    reassignUnknownStations(grouped);

    // Step E: Do final picking + filtering + rename to atlas-based name
    console.log("Filtering & picking stations per country...");
    const finalData = pickUpTo25PerCountry(grouped);

    // Step F: Write out JSON
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalData, null, 2));
    console.log(`\n✅ Saved station list to "${OUTPUT_FILE}"\n`);

    // Step G: Debug info
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
