import fs from 'fs';
import axios from 'axios';
import { countries, languages } from 'countries-list';

const BASE_URL = "https://de1.api.radio-browser.info/json";
const OUTPUT_FILE = "stations.json";
const STATIONS_PER_COUNTRY = 25;

/** 
 * Keywords typically associated with English or Anglo pop music.
 * We only filter these for countries WITHOUT "english" in their official language array.
 */
const ENGLISH_MUSIC_KEYWORDS = [
  "top 40", "hits", "classic rock", "pop", "alternative",
  "edm", "rnb", "hip hop", "trap", "house", "rock"
];

/** 
 * Some local genres to prioritize for certain countries (optional).
 * We'll push these up in the list for countries that have them.
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
 * 1) Build an object { "US": ["english"], "CA": ["english","french"], ... }
 *    from `countries-list`.
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
 * 2) Fetch ALL stations in one request (no hidebroken), with high limit.
 */
async function fetchAllStations() {
  const url = `${BASE_URL}/stations/search?limit=500000`;
  console.log(`\nFetching all stations from: ${url}`);
  const response = await axios.get(url);
  return response.data;
}

/**
 * 3) Group stations by uppercase country code ("US", "FR", etc.).
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
 * 4) "Rescue" stations from "UNKNOWN" if their .country includes certain keywords
 *    (purely optional).
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
 * Weighted distribution for multiple languages in a country:
 * 1 lang => 100%
 * 2 langs => 90%, 10%
 * 3 langs => 80%, 10%, 10%
 * 4 langs => 70%, 10%, 10%, 10%
 * 5+ langs => 70% main, 30% split among others
 */
function getLanguageWeights(langs) {
  const count = langs.length;
  if (count === 1) return { [langs[0]]: 1.0 };

  let mainWeight = 0.7;
  switch (count) {
    case 2: mainWeight = 0.9; break;
    case 3: mainWeight = 0.8; break;
    case 4: mainWeight = 0.7; break;
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
 * Filter out English music stations IF the country is NOT English-speaking.
 * We'll look at station name, tags, etc.
 */
function filterStationsByMusicLanguage(stations, countryCode) {
  const isEnglishSpeaking = OFFICIAL_LANGUAGES_BY_CC[countryCode]?.includes("english");

  return stations.filter((station) => {
    if (!station.language || !station.tags) {
      return false; // missing data
    }

    const stationLang = station.language.toLowerCase();
    const stationTags = station.tags.toLowerCase();
    const stationName = station.name.toLowerCase();

    // If this country DOES speak English officially, skip all these checks:
    if (isEnglishSpeaking) {
      return true;
    }

    // If NOT English-speaking, exclude stations that mention "english" in tags or language
    if (stationLang.includes("english") || stationTags.includes("english")) {
      return false;
    }

    // Exclude stations that might contain known English pop/rock keywords
    if (ENGLISH_MUSIC_KEYWORDS.some((kw) => stationName.includes(kw) || stationTags.includes(kw))) {
      return false;
    }

    return true;
  });
}

/**
 * Sort stations so local genres appear first (for countries that have defined local genres).
 */
function prioritizeLocalGenres(stations, countryCode) {
  const localGenres = LOCAL_GENRES[countryCode] || [];
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
 * Pick stations from each language bucket, factoring in the weighting distribution.
 * We'll only keep "exact single language" matches.
 */
function pickWeightedStationsForCountry(cc, stationList) {
  const officialLangs = OFFICIAL_LANGUAGES_BY_CC[cc] || [];
  if (officialLangs.length === 0) {
    // No official data => take the first 25
    return stationList.slice(0, STATIONS_PER_COUNTRY);
  }

  // Bucket by exact single official language
  const buckets = {};
  for (const lang of officialLangs) {
    buckets[lang] = [];
  }

  for (const st of stationList) {
    const splitted = st.language.toLowerCase().split(",").map(s => s.trim());
    // station must have EXACTLY 1 language that is official
    if (splitted.length === 1 && officialLangs.includes(splitted[0])) {
      buckets[splitted[0]].push(st);
    }
    // else skip
  }

  const weights = getLanguageWeights(officialLangs);
  const selected = [];

  // gather stations based on weights
  for (const lang of officialLangs) {
    // local genres first
    const sortedBucket = prioritizeLocalGenres(buckets[lang], cc);
    const portion = Math.floor(weights[lang] * STATIONS_PER_COUNTRY);
    selected.push(...sortedBucket.slice(0, portion));
  }

  // fill leftover from main language if needed
  let missing = STATIONS_PER_COUNTRY - selected.length;
  if (missing > 0) {
    const mainLang = officialLangs[0];
    const mainBucket = prioritizeLocalGenres(buckets[mainLang], cc);

    // how many we already took from mainLang
    const alreadyChosen = selected.filter(s => {
      return s.language.toLowerCase().trim() === mainLang;
    }).length;

    const leftover = mainBucket.slice(alreadyChosen);
    selected.push(...leftover.slice(0, missing));
  }

  return selected.slice(0, STATIONS_PER_COUNTRY);
}

/**
 * Main function that:
 * - Filters out English music from non-English countries
 * - Does a weighted language distribution
 * - Writes up to 25 stations per country to a final JSON
 */
function pickUpTo25PerCountry(grouped) {
  const finalData = {};

  for (const [cc, stationList] of Object.entries(grouped)) {
    if (!stationList.length) continue;

    // Filter out English music for non-English countries
    const filteredMusic = filterStationsByMusicLanguage(stationList, cc);

    // Weighted station picking
    const chosen = pickWeightedStationsForCountry(cc, filteredMusic);

    if (!chosen.length) continue;

    // user-friendly name: .country of first station or cc
    const friendlyName = chosen[0].country || cc;

    finalData[friendlyName] = chosen.map(st => ({
      name: st.name,
      url: st.url_resolved,
      country: st.country,
      countrycode: st.countrycode,
      language: st.language,
      bitrate: st.bitrate
    }));
  }
  return finalData;
}

/**
 * Main entry point
 */
async function main() {
  try {
    console.log("Fetching massive list of all stations...");
    const allStations = await fetchAllStations();
    console.log(`Fetched ${allStations.length} stations.\n`);

    console.log("Grouping by uppercase countrycode...");
    const grouped = groupByCountryCode(allStations);

    console.log("Reassigning UNKNOWN stations...");
    reassignUnknownStations(grouped);

    console.log("Filtering & picking stations per country...");
    const finalData = pickUpTo25PerCountry(grouped);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalData, null, 2));
    console.log(`\n✅ Saved station list to "${OUTPUT_FILE}"\n`);

    // Debug info
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
  }
}

main();
