import fs from 'fs';
import axios from 'axios';
import { countries, languages } from 'countries-list';

const BASE_URL = "https://de1.api.radio-browser.info/json";
const OUTPUT_FILE = "stations.json";
const STATIONS_PER_COUNTRY = 25;

/**
 * 1) Build an object { "US": ["english"], "CA": ["english","french"], ... }
 *    using the `countries-list` data.
 */
const OFFICIAL_LANGUAGES_BY_CC = {};

// countries-list uses ISO 3166-1 alpha-2 codes, e.g. "US", "GB", "FR".
Object.keys(countries).forEach((cc) => {
  // `countries[cc].languages` is an array of language codes like ["en", "fr"]
  const langCodes = countries[cc].languages; 
  // Convert each code (e.g. "en") to a lowercase name "english" using `languages` map
  // If unknown code, fallback to the code itself
  const langNames = langCodes.map((code) => {
    const langObj = languages[code];
    return langObj ? langObj.name.toLowerCase() : code;
  });
  // Example: "US" => ["english"], "CA" => ["english","french"], "DE" => ["german"]...
  OFFICIAL_LANGUAGES_BY_CC[cc] = langNames;
});


/**
 * 2) Fetch ALL stations in one request, with no hidebroken param,
 *    and a very high limit so we (hopefully) capture everything.
 */
async function fetchAllStations() {
  const url = `${BASE_URL}/stations/search?limit=500000`;  // no &hidebroken
  console.log(`\nFetching all stations from: ${url}`);
  const response = await axios.get(url);
  return response.data; 
}

/**
 * 3) Group stations by uppercase countrycode ( "US", "FR", "UNKNOWN", etc. ).
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
 * 4) "Rescue" stations from "UNKNOWN" if their .country string has
 *    recognizable keywords. This is purely optional and can be expanded.
 */
function reassignUnknownStations(grouped) {
  const unknownList = grouped["UNKNOWN"] || [];
  let rescuedCount = 0;

  const remainUnknown = [];

  for (const st of unknownList) {
    const countryStr = st.country?.toLowerCase() || "";
    if (countryStr.includes("russia")) {
      if (!grouped["RU"]) grouped["RU"] = [];
      grouped["RU"].push(st);
      rescuedCount++;
    } else if (countryStr.includes("united states")) {
      if (!grouped["US"]) grouped["US"] = [];
      grouped["US"].push(st);
      rescuedCount++;
    } else if (countryStr.includes("poland")) {
      if (!grouped["PL"]) grouped["PL"] = [];
      grouped["PL"].push(st);
      rescuedCount++;
    } else {
      remainUnknown.push(st);
    }
  }

  grouped["UNKNOWN"] = remainUnknown;
  console.log(`Reassigned ${rescuedCount} stations from UNKNOWN to recognized codes.\n`);
}

/**
 * 5) Filter stations so we only keep those whose language is an
 *    official language for the station's (uppercase) country code.
 */
function filterStationsByLanguage(stations, countryCode) {
  // countries-list uses 2-letter codes like "US", "FR", "RU", "DE", etc.
  // If station code not in OFFICIAL_LANGUAGES_BY_CC, fallback = []
  const allowedLangs = OFFICIAL_LANGUAGES_BY_CC[countryCode] || [];
  // If no official data, you can choose to allow all
  if (allowedLangs.length === 0) {
    return stations; // Allow all if no mapping found
  }

  return stations.filter((station) => {
    if (!station.language) return false;
    const stationLang = station.language.toLowerCase();
    // Let "includes" handle partial matches (e.g., "english music")
    return allowedLangs.some((lang) => stationLang.includes(lang));
  });
}

/**
 * 6) For each country group, filter by official language, then pick up to 25.
 *    Key the final JSON object by .country or fallback to the code.
 */
function pickUpTo25PerCountry(grouped) {
  const finalData = {};

  for (const [cc, stationList] of Object.entries(grouped)) {
    // Filter by official language
    const filteredByLang = filterStationsByLanguage(stationList, cc);

    // Now pick the first 25 (could shuffle for randomness)
    const selectedStations = filteredByLang.slice(0, STATIONS_PER_COUNTRY).map((st) => ({
      name: st.name,
      url: st.url_resolved,
      country: st.country,
      countrycode: st.countrycode,
      language: st.language,
      bitrate: st.bitrate,
    }));

    if (selectedStations.length === 0) {
      // If none pass language filter, skip or keep an empty array
      continue;
    }

    // Use .country of the first station as "friendly" name
    // if available, else fallback to the country code
    const friendlyName = selectedStations[0]?.country || cc;
    finalData[friendlyName] = selectedStations;
  }

  return finalData;
}

async function main() {
  try {
    console.log("Fetching a massive list of all stations (including 'broken')...");
    const allStations = await fetchAllStations();
    console.log(`Fetched ${allStations.length} stations total.\n`);

    console.log("Grouping by uppercase countrycode...");
    const grouped = groupByCountryCode(allStations);

    console.log("Reassigning UNKNOWN stations if they mention 'Russia', 'United States', etc...");
    reassignUnknownStations(grouped);

    console.log("Filtering each country by official language, then picking up to 25...");
    const finalData = pickUpTo25PerCountry(grouped);

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalData, null, 2));
    console.log(`\n✅ Saved balanced station list to "${OUTPUT_FILE}"\n`);

    // --- Debug Info ---
    let totalCountries = 0;
    let totalStationsInFinal = 0;
    console.log("--- Station Counts by Country (finalData) ---");
    for (const [countryName, stations] of Object.entries(finalData)) {
      console.log(`${countryName}: ${stations.length}`);
      totalCountries++;
      totalStationsInFinal += stations.length;
    }
    console.log(`\nTotal countries in finalData: ${totalCountries}`);
    console.log(`Total stations in finalData: ${totalStationsInFinal}\n`);

  } catch (err) {
    console.error("Failed to generate station list:", err.message);
  }
}

main();

// git fix