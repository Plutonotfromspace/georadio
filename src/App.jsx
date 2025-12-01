import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { flushSync } from 'react-dom';
import Globe from 'react-globe.gl';
import { feature } from 'topojson-client';
import * as THREE from 'three';
import './index.css';
import './App.css';
import Hls from 'hls.js';
import { geoCentroid } from 'd3-geo';
import { countries } from 'countries-list';
import { initGA, logEvent, logPageView } from './services/analytics';
// NEW: Import confetti animation library
import confetti from 'canvas-confetti';

/* Custom Hook: Tracks window's current width & height */
function useWindowSize() {
  const [size, setSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  });

  useEffect(() => {
    function handleResize() {
      setSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return size;
}

/* Add this map function near the top with other utility functions */
// Mapping of numeric country IDs (as in world-atlas) to ISO 3166-1 alpha-2 codes
const countryCodeMapping = {
  "004": "af", "008": "al", "012": "dz", "016": "as", "020": "ad", "024": "ao", "028": "ag", "031": "az",
  "032": "ar", "036": "au", "040": "at", "044": "bs", "048": "bh", "050": "bd", "051": "am", "052": "bb",
  "056": "be", "060": "bm", "064": "bt", "068": "bo", "070": "bw", "072": "bv", "074": "br", "076": "br",
  "084": "bz", "086": "io", "090": "sb", "092": "vg", "096": "bn", "100": "bg", "104": "mm", "108": "bi",
  "112": "by", "116": "kh", "120": "cm", "124": "ca", "132": "cv", "136": "ky", "140": "cf", "144": "lk",
  "148": "td", "152": "cl", "156": "cn", "158": "tw", "162": "cx", "166": "cc", "170": "co", "174": "km",
  "175": "yt", "178": "cg", "180": "cd", "184": "ck", "188": "cr", "191": "hr", "192": "cu", "196": "cy",
  "203": "cz", "204": "ci", "208": "dk", "212": "dm", "214": "do", "218": "ec", "222": "sv", "226": "gq",
  "231": "et", "232": "er", "233": "ee", "242": "fj", "246": "fi", "250": "fr", "254": "gf",
  "258": "pf", "260": "tf", "262": "dj", "266": "ga", "268": "ge", "270": "gm", "275": "ps", "276": "de",
  "288": "gh", "292": "gi", "296": "ki", "300": "gr", "304": "gl", "308": "gd", "312": "gp", "316": "gu",
  "320": "gt", "324": "gn", "328": "gy", "332": "ht", "334": "hm", "336": "va", "340": "hn", "344": "hk",
  "348": "hu", "352": "is", "356": "in", "360": "id", "364": "ir", "368": "iq", "372": "ie", "376": "il",
  "380": "it", "384": "jm", "388": "jp", "392": "jo", "398": "kz", "400": "ke", "404": "kp", "408": "kr",
  "410": "kw", "414": "kg", "417": "la", "418": "lb", "422": "ls", "426": "lr", "428": "ly", "430": "li",
  "434": "lt", "438": "lu", "440": "mo", "442": "mk", "446": "mg", "450": "mt", "454": "mw", "458": "my",
  "462": "mv", "466": "ml", "470": "mt", "478": "mr", "480": "mu", "484": "mx", "492": "mc", "496": "mn",
  "498": "md", "500": "ms", "504": "ma", "508": "mz", "512": "om", "516": "na", "520": "nr", "524": "np",
  "528": "nl", "531": "an", "533": "aw", "540": "nc", "548": "vn", "554": "nz", "558": "ni", "562": "ne",
  "566": "ng", "570": "nu", "574": "nf", "578": "no", "580": "mp", "581": "fm", "583": "mh", "584": "pw",
  "585": "pk", "586": "pa", "591": "pg", "598": "py", "600": "pe", "604": "pl", "608": "pt", "612": "gw",
  "616": "ph", "620": "pr", "624": "qa", "626": "re", "630": "ro", "634": "ru", "642": "rw", "643": "bl",
  "646": "sh", "654": "kn", "659": "lc", "662": "pm", "666": "vc", "670": "ws", "674": "sm", "678": "st",
  "682": "sa", "686": "sn", "688": "rs", "690": "sc", "694": "sl", "702": "sg", "703": "sk", "704": "vn",
  "705": "si", "706": "so", "710": "za", "716": "zw", "724": "es", "728": "sd", "729": "ss", "731": "sz",
  "740": "sd", "748": "sr", "752": "se", "756": "ch", "760": "sy", "762": "tj", "764": "th", "768": "tg",
  "772": "tk", "776": "to", "780": "tt", "784": "ae", "788": "tn", "792": "tr", "795": "tm", "796": "tc",
  "798": "tv", "800": "ug", "804": "ua", "807": "mk", "818": "eg", "826": "gb", "834": "tz", "840": "us",
  "850": "vi", "854": "bf", "858": "uy", "860": "uz", "862": "ve", "876": "wf", "882": "ws", "887": "ye",
  "894": "zm"
};

// Build a mapping from lowercased official country names to iso2 codes
const countryNameToCode = {};
for (const iso in countries) {
  const countryName = countries[iso].name.toLowerCase();
  countryNameToCode[countryName] = iso.toLowerCase();
}

// Updated getCountryCode function
const getCountryCode = (feature) => {
  // Use iso_a2 if available and valid
  if (feature.properties?.iso_a2 && feature.properties.iso_a2 !== "-") {
    return feature.properties.iso_a2.toLowerCase();
  }
  // Fallback: use cleaned country name to lookup ISO code from countries-list
  if (feature.properties?.name) {
    const cleanedName = feature.properties.name.toLowerCase().trim();
    if (countryNameToCode[cleanedName]) {
      return countryNameToCode[cleanedName];
    }
  }
  // Fallback to numeric mapping using feature.id
  if (feature.id && countryCodeMapping[feature.id]) {
    return countryCodeMapping[feature.id];
  }
  console.log('Could not determine country code for:', feature);
  return 'un';
};

// Update DEBUG object to include station functions
const DEBUG = {
  setTargetCountry: null,
  setRadioStation: null,
  countries: {},
  stations: {},
};

// Update debug commands
window.debugGeoRadio = {
  forceCountry: (countryName) => {
    if (!DEBUG.setTargetCountry || !DEBUG.countries[countryName.toLowerCase()]) {
      console.log('Country not found or game not initialized');
      return false;
    }

    const country = DEBUG.countries[countryName.toLowerCase()];
    const stations = DEBUG.stations[countryName] || [];
    
    if (stations.length === 0) {
      console.log('No stations found for country:', countryName);
      return false;
    }

    // Pick random station from country
    const station = stations[Math.floor(Math.random() * stations.length)];
    
    // Set both country and station
    DEBUG.setTargetCountry(country);
    DEBUG.setRadioStation(station);

    // NEW: Add the same debug log seen in startNewRound
    const stationUrl = station.url_resolved || station.url;
    console.log('DEBUG - Target Country:', {
      name: country.properties?.name,
      station: station.name,
      stationCountry: station.sourceCountry ?? station.country,
      stationURL: stationUrl,
      language: station.language ?? 'Unknown'
    });

    console.log(`Target set to: ${countryName}`);
    console.log(`Playing station: ${station.name}`);
    return true;
  },
  // ...existing help and listCountries methods...
};

function App() {
  const { width, height } = useWindowSize();
  const globeEl = useRef();
  const audioRef = useRef(null);

  const [countriesData, setCountriesData] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [targetCountry, setTargetCountry] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  // NEW: Animated score state for score animation effect.
  const [animatedScore, setAnimatedScore] = useState(0);
  // NEW: Holds the id of the correctly guessed country to highlight it.
  const [feedback, setFeedback] = useState('');
  const [radioStation, setRadioStation] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [volume, setVolume] = useState(50); // new state for volume
  const [currentRound, setCurrentRound] = useState(1);
  const [roundResults, setRoundResults] = useState([]);
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [usedCountries, setUsedCountries] = useState([]);
  const [allStations, setAllStations] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const isMobile = width <= 768; // Add this line to detect mobile
  const [usedLanguages, setUsedLanguages] = useState(new Set()); // Add this new state
  // Add new state for correct guess
  const [correctGuess, setCorrectGuess] = useState(false);
  const [continueFading, setContinueFading] = useState(false);
  // Modal closing animation states
  const [modalClosing, setModalClosing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // NEW: Add state for triggering scoreboard animation
  const [scoreboardAnimationStage, setScoreboardAnimationStage] = useState('');
  // NEW: State to track when the scoreboard is in the middle
  const [scoreboardInMiddle, setScoreboardInMiddle] = useState(false);
  // NEW: State for preloaded flag image
  const [preloadedFlagUrl, setPreloadedFlagUrl] = useState(null);

  // Initialize GA when app loads
  useEffect(() => {
    initGA();
    logPageView();
  }, []);

  /* Helper function to parse hex color to RGB */
  function hexToRgb(hex) {
    // Handle null/undefined
    if (!hex) return null;
    // Ensure hex is a string
    const hexStr = String(hex);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexStr);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  /* Helper function to convert RGB to hex */
  function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  /* Helper function to interpolate between two colors */
  function interpolateColor(color1, color2, factor) {
    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);
    // If either color is invalid, return the target color (color2) or a default
    if (!c1 || !c2) return color2 || '#4CAF50';
    return rgbToHex(
      c1.r + (c2.r - c1.r) * factor,
      c1.g + (c2.g - c1.g) * factor,
      c1.b + (c2.b - c1.b) * factor
    );
  }

  /* Distance to Color Scale */
  function getColor(distance) {
    if (distance > 12000) return '#fef2dc';
    if (distance > 9000) return '#fee8cc';
    if (distance > 6500) return '#fedebc';
    if (distance > 5000) return '#fec89e';
    if (distance > 4000) return '#febf8f';
    if (distance > 3000) return '#fea671';
    if (distance > 2500) return '#fe9a62';
    if (distance > 2000) return '#fe8444';
    if (distance > 1500) return '#fe7835';
    if (distance > 1200) return '#fe6e26';
    if (distance > 900) return '#fe5e1a';
    if (distance > 600) return '#ea520f';
    if (distance > 300) return '#d44505';
    return '#b83700';
  }

  /* Load Country Data */
  useEffect(() => {
    fetch('https://unpkg.com/world-atlas@2/countries-110m.json')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load country data: ${res.status}`);
        }
        return res.json();
      })
      .then((worldData) => {
        const { features } = feature(worldData, worldData.objects.countries);
        setCountriesData(features);
      })
      .catch((err) => {
        console.error('Error loading country data:', err);
        setFeedback("Error loading country data. Check your network connection.");
      });
  }, []);

  // Modify the stations fetch effect to only store the data
  useEffect(() => {
    async function fetchStationsOnce() {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}stations.json`);
        const stationsData = await res.json();
        setAllStations(stationsData);
        console.log('DEBUG: Loaded stations from stations.json:', Object.keys(stationsData).length);
      } catch (error) {
        console.error("Error fetching stations from local file:", error);
      }
    }
    fetchStationsOnce();
  }, []);

  /* Compute Centroid of a Country */
  const computeCentroid = (feature) => {
    /* Using d3-geo for accurate centroid calculation */
    const [lon, lat] = geoCentroid(feature);
    return { lat, lon };
  };

  /* Calculate Distance Between Two Points */
  const toRadians = (deg) => deg * (Math.PI / 180);
  const computeDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Earth radius in km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon1 - lon2);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // NEW: Animate score change using requestAnimationFrame.
  useEffect(() => {
    if (scoreboardInMiddle) {
      let start = animatedScore;
      let end = score;
      let startTime = null;
      const duration = 1000; // 1 second animation
      function animate(time) {
        if (!startTime) startTime = time;
        const progress = Math.min((time - startTime) / duration, 1);
        const current = Math.floor(start + (end - start) * progress);
        setAnimatedScore(current);
        if (progress < 1) requestAnimationFrame(animate);
      }
      requestAnimationFrame(animate);
    } 
    /* Removed else branch resetting animatedScore to 0 */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scoreboardInMiddle, score]);

  /* Start a New Round: Now fetches a random radio station and sets the target country */
  const startNewRound = useCallback(() => {
    if (!countriesData.length || !allStations) return;
    
    // Reset states including correctGuess
    setCorrectGuess(false);
    setAudioPlaying(false);

    // 1. Group stations by language first
    const stationsByLanguage = {};
    Object.entries(allStations).forEach(([country, stations]) => {
      stations.forEach(station => {
        if (!station.language) return;
        
        const languages = station.language.toLowerCase().split(/[,\s]+/);
        languages.forEach(lang => {
          if (!stationsByLanguage[lang]) {
            stationsByLanguage[lang] = [];
          }
          stationsByLanguage[lang].push({
            ...station,
            sourceCountry: country
          });
        });
      });
    });

    // Log available languages and stations for debugging
    console.log('DEBUG - Available languages:', Object.keys(stationsByLanguage));

    // 2. Filter out languages with too few stations/countries
    const validLanguages = Object.entries(stationsByLanguage)
      .filter(([, stations]) => {
        const uniqueCountries = new Set(stations.map(s => s.sourceCountry));
        return stations.length >= 1 && uniqueCountries.size > 0;
      })
      .map(([lang]) => lang);

    // NEW: Filter out used languages unless all languages have been used
    let availableLanguages = validLanguages.filter(lang => !usedLanguages.has(lang));
    if (availableLanguages.length === 0) {
      // If all languages used, reset and use all languages
      availableLanguages = validLanguages;
      setUsedLanguages(new Set());
      console.log('DEBUG - All languages used, resetting language pool');
    }

    if (availableLanguages.length === 0) {
      console.error('No valid languages available');
      setFeedback("No valid stations available!");
      return;
    }

    // 3. Pick random language from valid ones
    const randomLanguage = availableLanguages[Math.floor(Math.random() * availableLanguages.length)];
    const stationsInLanguage = stationsByLanguage[randomLanguage];

    // Log selected language and available countries
    console.log('DEBUG - Selected language:', randomLanguage);

    // 4. Get available countries that: 
    // a) Have stations in this language
    const availableCountries = [...new Set(stationsInLanguage.map(s => 
      (s.sourceCountry && s.sourceCountry.trim()) || (s.country && s.country.trim())
    ))]
      .filter(country => country);

    if (!availableCountries.length) {
      console.error('No available countries for language:', randomLanguage);
      startNewRound(); // Skip current language and try a new station
      return;
    }

    // Log available countries
    console.log('DEBUG - Available countries:', availableCountries);

    // 5. Pick random country from those available
    const randomCountry = availableCountries[Math.floor(Math.random() * availableCountries.length)];
    
    // 6. Find target country in map data
    const target = countriesData.find(
      feature => {
        const featureName = feature.properties?.name || "";
        return featureName.toLowerCase() === randomCountry.toLowerCase();
      }
    );

    if (!target) {
      console.error('Could not find target country in map data:', randomCountry);
      // Debugging: Log normalized station country and all normalized map country names
      const normalizedStationName = randomCountry.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
      const normalizedMapCountries = countriesData.map(feature => ({
        name: feature.properties?.name,
        normalized: (feature.properties?.name || "").toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, "")
      }));
      console.debug('Normalized station country:', normalizedStationName);
      console.debug('Normalized map countries:', normalizedMapCountries);
      
      // Mark this country as used and try another
      setUsedCountries(prev => [...prev, randomCountry.toLowerCase()]);
      startNewRound();
      return;
    }

    // 7. Get stations for this country and language
    const eligibleStations = stationsInLanguage.filter(s => 
      s.sourceCountry === randomCountry
    );

    if (!eligibleStations.length) {
      console.error('No eligible stations found for country:', randomCountry);
      startNewRound();
      return;
    }

    // 8. Pick random station from eligible ones
    const station = eligibleStations[Math.floor(Math.random() * eligibleStations.length)];
    const stationUrl = station.url_resolved || station.url;
    setRadioStation({ ...station, url_resolved: stationUrl });


    setTargetCountry(target);
    console.log('DEBUG - Target Country:', {
      name: target.properties?.name,
      station: station.name,
      stationCountry: station.sourceCountry,
      stationURL: stationUrl,
      language: randomLanguage
    });

    // ...rest of existing startNewRound code...

    setAttempts(0);
    // setGuesses([]); // Remove this so guesses remain for display in the round summary
    setFeedback(""); // Removed "Ready for next round" message
    
    // Audio setup
    const audioElement = audioRef.current;
    if (audioElement) {
      // Set crossOrigin to allow cross-origin streaming
      audioElement.crossOrigin = "anonymous";
      if (audioElement.hlsInstance) {
        audioElement.hlsInstance.destroy();
        audioElement.hlsInstance = null;
      }
      console.log("DEBUG: Setting up audio source", stationUrl);
      if (Hls.isSupported() && stationUrl.endsWith('.m3u8')) {
        const hls = new Hls();
        hls.loadSource(stationUrl);
        hls.attachMedia(audioElement);
        audioElement.hlsInstance = hls;
      } else {
        audioElement.src = stationUrl;
      }
      audioElement.load(); // force reload the audio source
    }
  }, [countriesData, allStations, usedLanguages]);

  // Remove or comment out the duplicated effect:
  /*
  // useEffect(() => {
  //   if (countriesData.length > 0 && gameStarted) {
  //     startNewRound();
  //   }
  // }, [countriesData, gameStarted, startNewRound]);
  */

  /* Handle Guess - updated with logging and modal check */
  const onPolygonClick = (feature) => {
    // NEW: Do nothing if a correct guess has been made
    if (correctGuess) return;
    
    if (showRoundModal || gameOver) return;
    if (!targetCountry) return;
    
    const polygonId = feature.properties?.iso_a2 || feature.properties?.name || feature.id;
    // If already guessed, ignore
    if (guesses.some((g) => g.id === polygonId)) return;
    
    if (isMobile) {
      // Mobile: Set as selected country
      setSelectedCountry({ ...feature, polygonId });
    } else {
      // Desktop: Make guess immediately
      handleConfirmGuess({ ...feature, polygonId });
    }
  };

  // Move guess logic to confirmation handler
  const handleConfirmGuess = (feature = selectedCountry) => {
    if (!feature) return;
    
    console.log('DEBUG - Guess:', {
      guessed: feature.properties?.name,
      target: targetCountry.properties?.name
    });
  
    const newAttempts = attempts + 1;
    const guessCentroid = computeCentroid(feature);
    const targetCentroid = computeCentroid(targetCountry);
    const distance = computeDistance(
      guessCentroid.lat, guessCentroid.lon,
      targetCentroid.lat, targetCentroid.lon
    );
    const guessedName = feature.properties?.name || feature.id || 'Unknown';
    
    let newFeedback = "";
    if (guesses.length === 0) {
      newFeedback = ""; // Removed first guess message
    } else {
      const lastGuess = guesses[guesses.length - 1];
      newFeedback = distance < lastGuess.distance
        ? `${guessedName} is warmer`
        : `${guessedName} is cooler`;
    }
  
    let updatedScore = score;
    
    // Compute new guess before updating round result
    const newGuess = { 
      id: feature.properties?.iso_a2 || feature.properties?.name || feature.id,
      name: guessedName, 
      distance, 
      color: getColor(distance), 
      countryCode: getCountryCode(feature),
      altitude: 0.08 // Start with elevated altitude for pop effect
    };
    
    if (distance < 10) { // changed threshold from 50 to 10
      const targetCentroid = computeCentroid(targetCountry);
      // Auto rotate globe view to center on correct country
      if (globeEl.current) {
        globeEl.current.pointOfView(
          { lat: targetCentroid.lat, lng: targetCentroid.lon, altitude: 0.1 }, // changed altitude for zoom
          2000
        );
      }
      // Stop radio station immediately
      if (audioRef.current) {
        audioRef.current.pause();
        setAudioPlaying(false);
      }

      // Play success sound with explicit volume control
      const sfx = successSound.cloneNode();
      sfx.volume = 0.10; // Force volume to be very low (1%)
      setTimeout(() => {
        sfx.play().catch(err => console.log('Audio play failed:', err));
      }, 10);
      
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      // Remove the setTimeout and add animation class
      document.querySelector('.audio-player').classList.add('flip-out');
      // Show the continue button with flip-in animation after audio player flips out
      // Existing correct guess handling...
      logEvent('game', 'correct_guess', `Round ${currentRound}: ${targetCountry.properties?.name}`);
      const targetName = targetCountry.properties?.name || targetCountry.id || 'Unknown';
      const baseScore = 5000;
      const roundScore = Math.max(baseScore - ((newAttempts - 1) * 573), 0);
      newFeedback = ""; // Clear any existing feedback instead
      updatedScore += roundScore;
      // Store full round result including station details and guesses (including current guess)
      setRoundResults([
        ...roundResults, 
        { 
          round: currentRound, 
          attempts: newAttempts, 
          score: roundScore, 
          target: targetName,
          stationName: radioStation.name || 'Unknown Station',
          stationUrl: radioStation.homepage || radioStation.url,
          guesses: [...guesses, newGuess]
        }
      ]);
  
      const stationCountry = radioStation?.country
        ?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
      if (stationCountry && !usedCountries.includes(stationCountry)) {
        console.log('DEBUG: Marking correct country used:', stationCountry);
        setUsedCountries((prev) => [...prev, stationCountry]);
      }

      // Mark the language as used when correctly guessed
      if (radioStation?.language) {
        const languages = radioStation.language.toLowerCase().split(/[,\s]+/);
        setUsedLanguages(prev => {
          const newSet = new Set(prev);
          languages.forEach(lang => newSet.add(lang));
          return newSet;
        });
        console.log('DEBUG - Marking language as used:', radioStation.language);
      }
      // When guess is correct, set correctGuess to true
      setCorrectGuess(true);
      
      // Preload the flag image for the modal
      const flagCode = getCountryCode(targetCountry);
      const flagUrl = `https://flagcdn.com/w640/${flagCode}.png`;
      const flagImg = new Image();
      flagImg.src = flagUrl;
      flagImg.onload = () => setPreloadedFlagUrl(flagUrl);
      
      if (globeEl.current) {
        // Offset to the left: subtract from the target country's longitude
        const cameraOffset = {
          lat: targetCentroid.lat,
          lng: targetCentroid.lon - 1, // adjust offset as needed
          altitude: 1.0
        };
        globeEl.current.pointOfView(cameraOffset, 2000);
      }
    }
    
    setAttempts(newAttempts);
    setScore(updatedScore);
    setFeedback(newFeedback);
    
    // Add guess and animate with spring physics for snappy "pop" effect
    const guessId = newGuess.id;
    const startAltitude = 0.01; // Start from ground level
    const peakAltitude = 0.10;  // Overshoot high
    const restAltitude = 0.015; // Final resting position
    
    // Add at ground level first
    flushSync(() => {
      setGuesses(prevGuesses => [...prevGuesses, { ...newGuess, altitude: startAltitude }]);
    });
    
    // Use keyframe approach - set discrete points and let Globe interpolate
    // Frame 1: Jump to peak (Globe transitions here over ~50ms)
    setTimeout(() => {
      flushSync(() => {
        setGuesses(prevGuesses => 
          prevGuesses.map(g => 
            g.id === guessId ? { ...g, altitude: peakAltitude } : g
          )
        );
      });
    }, 30);
    
    // Frame 2: Drop to undershoot
    setTimeout(() => {
      flushSync(() => {
        setGuesses(prevGuesses => 
          prevGuesses.map(g => 
            g.id === guessId ? { ...g, altitude: restAltitude * 0.5 } : g
          )
        );
      });
    }, 150);
    
    // Frame 3: Small bounce up
    setTimeout(() => {
      flushSync(() => {
        setGuesses(prevGuesses => 
          prevGuesses.map(g => 
            g.id === guessId ? { ...g, altitude: restAltitude * 1.2 } : g
          )
        );
      });
    }, 250);
    
    // Frame 4: Settle at rest
    setTimeout(() => {
      flushSync(() => {
        setGuesses(prevGuesses => 
          prevGuesses.map(g => 
            g.id === guessId ? { ...g, altitude: restAltitude } : g
          )
        );
      });
    }, 350);

    // Clear selection after guess
    setSelectedCountry(null);
  };

  /* Handler to move to the next round */
  const handleNextRound = () => {
    setContinueFading(false);
    if (currentRound < 5) {
      // Reset the animation classes
      const audioPlayer = document.querySelector('.audio-player');
      const continueButton = document.querySelector('.continue-button');
      
      audioPlayer.classList.remove('flip-out');
      continueButton.classList.remove('flip-in');
      
      // Force a reflow to reset animations
      void audioPlayer.offsetWidth;
      
      // Reset globe to default view
      if (globeEl.current) {
        globeEl.current.pointOfView(
          { lat: 0, lng: 0, altitude: 2.5 }, // default zoomed out position
          2000 // animation duration
        );
      }
      
      setCorrectGuess(false);
      // ...existing code...
      logEvent('game', 'next_round', `Round ${currentRound + 1} started`);
      // Stop current audio before moving to next round
      if (audioRef.current) {
        audioRef.current.pause();
        setAudioPlaying(false);
      }
      
      // Trigger closing animation
      setModalClosing(true);
      
      // Animate heatmap colors to green using requestAnimationFrame
      const targetColor = '#4CAF50';
      const animationDuration = 300; // 300ms animation
      const startTime = performance.now();
      // Capture a snapshot of guesses at the start of animation to avoid stale closures
      const guessesSnapshot = [...guesses];
      const originalColors = guessesSnapshot.map(g => g.color || '#4CAF50');
      
      function animateColors(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / animationDuration, 1);
        
        // Ease-out function for smoother animation
        const easeOutProgress = 1 - Math.pow(1 - progress, 3);
        
        // Update each guess with interpolated color using the snapshot
        const animatedGuesses = guessesSnapshot.map((g, i) => ({
          ...g,
          color: interpolateColor(originalColors[i], targetColor, easeOutProgress)
        }));
        // Use flushSync to force React to immediately apply the state update
        // This ensures the Globe component re-renders with the new colors each frame
        flushSync(() => {
          setGuesses(animatedGuesses);
        });
        
        if (progress < 1) {
          requestAnimationFrame(animateColors);
        } else {
          // Animation complete - wait a bit more then clear
          setTimeout(() => {
            setCurrentRound(currentRound + 1);
            setShowRoundModal(false);
            setModalClosing(false);
            setAttempts(0);
            setGuesses([]); // Now safe to clear - colors already match default
            setPreloadedFlagUrl(null); // Reset preloaded flag for next round
            
            startNewRound();
            
            // Start playing audio after a short delay to ensure proper setup
            setTimeout(() => {
              if (audioRef.current && radioStation) {
                audioRef.current.play()
                  .then(() => {
                    setAudioPlaying(true);
                    setFeedback(""); // Changed from "Audio playing. Take your guess!" to empty string
                  })
                  .catch(e => {
                    if (!(e.message && e.message.includes("aborted"))) {
                      console.error("Audio playback error:", e);
                    }
                  });
              }
            }, 100);
          }, 100); // Small buffer after animation completes
        }
      }
      
      if (guesses.length > 0) {
        requestAnimationFrame(animateColors);
      } else {
        // No guesses to animate, just proceed
        setTimeout(() => {
          setCurrentRound(currentRound + 1);
          setShowRoundModal(false);
          setModalClosing(false);
          setAttempts(0);
          setGuesses([]);
          setPreloadedFlagUrl(null);
          startNewRound();
        }, 250);
      }
      
      // Flip in audio player - only when continuing to next round
      audioPlayer.classList.add('flip-in-reset');
      setTimeout(() => {
        audioPlayer.classList.remove('flip-in-reset');
      }, 500);
    } else {
      logEvent('game', 'game_over', `Final score: ${score}`);
      
      // Trigger closing animation
      setModalClosing(true);
      
      // Wait for animation to complete before switching to game over
      setTimeout(() => {
        setShowRoundModal(false);
        setModalClosing(false);
        setGameOver(true);
      }, 250);
    }
  };

  // Add cleanup effect
  useEffect(() => {
    const audioElement = audioRef.current;
    return () => {
      if (audioElement) {
        audioElement.pause();
        if (audioElement.hlsInstance) {
          audioElement.hlsInstance.destroy();
        }
      }
    };
  }, []);

  /* Handler to restart the entire game */
  const playAgain = () => {
    // Reset globe to default position
    if (globeEl.current) {
      globeEl.current.pointOfView(
        { lat: 0, lng: 0, altitude: 2.5 }, // default zoomed out position
        2000 // animation duration
      );
    }

    // Trigger closing animation
    setModalClosing(true);
    
    // Animate heatmap colors to green using requestAnimationFrame (for game over modal)
    const targetColor = '#4CAF50';
    const animationDuration = 300; // 300ms animation
    const startTime = performance.now();
    // Capture a snapshot of guesses at the start of animation to avoid stale closures
    const guessesSnapshot = [...guesses];
    const originalColors = guessesSnapshot.map(g => g.color || '#4CAF50');
    
    function animateColorsPlayAgain(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);
      
      // Ease-out function for smoother animation
      const easeOutProgress = 1 - Math.pow(1 - progress, 3);
      
      // Update each guess with interpolated color using the snapshot
      const animatedGuesses = guessesSnapshot.map((g, i) => ({
        ...g,
        color: interpolateColor(originalColors[i], targetColor, easeOutProgress)
      }));
      // Use flushSync to force React to immediately apply the state update
      flushSync(() => {
        setGuesses(animatedGuesses);
      });
      
      if (progress < 1) {
        requestAnimationFrame(animateColorsPlayAgain);
      } else {
        // Animation complete - wait a bit more then reset
        setTimeout(() => {
          logEvent('game', 'replay', 'Game replayed');
          setCurrentRound(1);
          setRoundResults([]);
          setGameOver(false);
          setModalClosing(false);
          setFeedback("");
          setAttempts(0);
          setScore(0);
          setAnimatedScore(0);
          setGuesses([]);
          setPreloadedFlagUrl(null); // Reset preloaded flag
          setUsedCountries([]); // Clear used countries for a fresh start
          
          startNewRound();
          // Reset audio player animations
          const audioPlayer = document.querySelector('.audio-player');
          if (audioPlayer) {
            audioPlayer.classList.remove('flip-out');
            audioPlayer.classList.add('flip-in-reset');
            setTimeout(() => {
              audioPlayer.classList.remove('flip-in-reset');
            }, 500);
          }
        }, 100); // Small buffer after animation completes
      }
    }
    
    if (guesses.length > 0) {
      requestAnimationFrame(animateColorsPlayAgain);
    } else {
      // No guesses to animate, just proceed
      setTimeout(() => {
        logEvent('game', 'replay', 'Game replayed');
        setCurrentRound(1);
        setRoundResults([]);
        setGameOver(false);
        setModalClosing(false);
        setFeedback("");
        setAttempts(0);
        setScore(0);
        setAnimatedScore(0);
        setGuesses([]);
        setPreloadedFlagUrl(null);
        setUsedCountries([]);
        startNewRound();
      }, 250);
    }
  };

  // Helper to mimic "Station broken?" button
  const callStationBroken = useCallback(() => {
    startNewRound();
  }, [startNewRound]);

  // Wrap handleAudioError in useCallback
  const handleAudioError = useCallback((error) => {
    setIsLoading(true); // Keep loading state during error
    if (error?.code === 1) {
      setFeedback('Audio aborted or blocked. Please try another station or allow audio.');
      // ...any additional logic...
    }
    if (!error) return; // Guard against null errors
    console.error("Audio Error:", error);
    
    // Handle all media error codes
    if (error.code === 1) { // MEDIA_ERR_ABORTED
      console.log("Media playback aborted, trying new station...");
      callStationBroken();
      return;
    }
    
    // Check for CORS and other errors
    if (error.message?.includes('CORS') || 
        error.name === 'SecurityError' || 
        error.name === 'NotAllowedError' ||
        error.name === 'NotSupportedError' ||
        error.code === 2 || // MEDIA_ERR_NETWORK
        error.code === 3 || // MEDIA_ERR_DECODE
        error.code === 4    // MEDIA_ERR_SRC_NOT_SUPPORTED
    ) {
      console.log("Media error detected, refreshing station...");
      callStationBroken();
    }
  }, [callStationBroken]);

  // Update the useEffect to include handleAudioError in dependencies
  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.addEventListener('error', (e) => handleAudioError(e.target.error));
    }
    return () => {
      if (audioElement) {
        audioElement.removeEventListener('error', (e) => handleAudioError(e.target.error));
        audioElement.pause();
        if (audioElement.hlsInstance) {
          audioElement.hlsInstance.destroy();
        }
      }
    };
  }, [handleAudioError]); // Add handleAudioError to dependencies

  /* Globe Material */
  const globeMaterial = useMemo(
    () => new THREE.MeshPhongMaterial({ color: '#03A9F4' }),
    []
  );

  // Updated toggleAudio function
  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
    } else {
      setIsLoading(true); // Show spinner before play
      audioRef.current
        .play()
        .then(() => {
          setIsLoading(false); // Hide spinner once play promise resolves
          setAudioPlaying(true);
        })
        .catch((e) => {
          if (!(e.message && e.message.includes("aborted"))) {
            console.error("Audio playback error in toggleAudio:", e);
            callStationBroken();
          }
          setIsLoading(false); // Clear loading on error
        });
    }
  };

  // Volume change handler
  const onVolumeChange = (e) => {
    const vol = Number(e.target.value);
    setVolume(vol); // Add this line to update the volume state
    if (audioRef.current) {
      audioRef.current.volume = vol / 100;
    }
  };

  // Update onGameStart to handle game initialization
  const onGameStart = () => {
    logEvent('game', 'start', 'New game started');
    setGameStarted(true);
    setCurrentRound(1);
    setScore(0);
    setAnimatedScore(0);
    setUsedCountries([]);
    setUsedLanguages(new Set());
    startNewRound(); // Starts new round after user gesture
    // Ensure radioStation is set before starting game logic
    if (radioStation && audioRef.current) {
      audioRef.current.src = radioStation.url_resolved || radioStation.url;
      audioRef.current.load(); // trigger loading immediately
      console.log(`onGameStart: Station "${radioStation.name}" is being loaded.`);
    }
  };

  // Debug useEffect to test station-country mappings in development mode
  useEffect(() => {
    if (import.meta.env.MODE === 'development' && countriesData.length && Object.keys(allStations).length) {
      const stationCountries = new Set();
      Object.values(allStations).forEach((stations) => {
        stations.forEach(station => {
          /* Use trimmed values to ignore empty strings */
          const src = (station.sourceCountry && station.sourceCountry.trim()) || (station.country && station.country.trim());
          if (src) {
            station.sourceCountry = src;
            stationCountries.add(src);
          } else {
            console.error('Station missing sourceCountry and country:', station);
          }
        });
      });

      stationCountries.forEach(sc => {
        if (!sc) return; // Extra safeguard
        const found = countriesData.find(feature => {
          const featureName = feature.properties?.name || "";
          return featureName.toLowerCase() === sc.toLowerCase();
        });
        if (!found) {
          console.error('No match for station country:', sc, { tokens: sc.toLowerCase() });
        } else {
          console.log('Match found for station country:', sc);
        }
      });
    }
  }, [countriesData, allStations]);

  // New debugging: Log normalized globe names for each feature
  useEffect(() => {
    if (countriesData.length) {
      console.debug('DEBUG - Globe country tokens:');
      countriesData.forEach(feature => {
        const originalName = feature.properties?.name || '';
        const tokens = originalName.toLowerCase();
        console.log({ originalName, tokens });
      });
    }
  }, [countriesData]);

  // NEW: Handle continue button click with fade out animation then open modal
  const handleContinue = () => {
    setContinueFading(true);
    setTimeout(() => {
      setShowRoundModal(true);
      // Removed: setContinueFading(false);
    }, 500); // duration matches CSS transition timing
  };

  // Add success sound effect with lower volume
  const successSound = useMemo(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}audio/success.mp3`);
    audio.volume = 0.05; // Set volume to 5%
    return audio;
  }, []);

  // Add this useEffect after countriesData is loaded
  useEffect(() => {
    if (countriesData.length) {
      // Build lookup of normalized country names to features
      DEBUG.countries = countriesData.reduce((acc, feature) => {
        const name = feature.properties?.name?.toLowerCase();
        if (name) {
          acc[name] = feature;
        }
        return acc;
      }, {});

      // Store reference to function that can change target
      DEBUG.setTargetCountry = (feature) => {
        setTargetCountry(feature);
      };
    }
  }, [countriesData]);

  // Update the countriesData useEffect to also store stations
  useEffect(() => {
    if (countriesData.length && allStations) {
      // Build country lookup
      DEBUG.countries = countriesData.reduce((acc, feature) => {
        const name = feature.properties?.name?.toLowerCase();
        if (name) {
          acc[name] = feature;
        }
        return acc;
      }, {});

      // Store stations lookup
      DEBUG.stations = allStations;

      // Store setter functions
      DEBUG.setTargetCountry = (feature) => {
        setTargetCountry(feature);
      };
      
      DEBUG.setRadioStation = (station) => {
        const stationUrl = station.url_resolved || station.url;
        setRadioStation({ ...station, url_resolved: stationUrl });
        
        // Setup audio
        const audioElement = audioRef.current;
        if (audioElement) {
          audioElement.pause();
          audioElement.crossOrigin = "anonymous";
          if (audioElement.hlsInstance) {
            audioElement.hlsInstance.destroy();
            audioElement.hlsInstance = null;
          }
          if (Hls.isSupported() && stationUrl.endsWith('.m3u8')) {
            const hls = new Hls();
            hls.loadSource(stationUrl);
            hls.attachMedia(audioElement);
            audioElement.hlsInstance = hls;
          } else {
            audioElement.src = stationUrl;
          }
          audioElement.load();
          audioElement.play().catch(console.error);
          setAudioPlaying(true);
        }
      };
    }
  }, [countriesData, allStations]);

  // Add loading handler for audio element
  const handleAudioLoadStart = useCallback(() => {
    setIsLoading(true);
  }, []);

  const handleAudioLoadEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Handler for flag image load errors - sets fallback UN flag
  const handleFlagError = useCallback((e) => {
    const src = e.target.src;
    // Determine the correct fallback based on the current URL pattern
    if (src.includes('/w640/')) {
      e.target.src = 'https://flagcdn.com/w640/un.png';
    } else if (src.includes('/w80/')) {
      e.target.src = 'https://flagcdn.com/w80/un.png';
    } else if (src.includes('/w40/')) {
      e.target.src = 'https://flagcdn.com/w40/un.png';
    } else {
      e.target.src = 'https://flagcdn.com/w80/un.png';
    }
  }, []);

  // Update audio element setup
  useEffect(() => {
    const audioElement = audioRef.current;
    if (audioElement) {
      audioElement.addEventListener('loadstart', handleAudioLoadStart);
      audioElement.addEventListener('canplay', handleAudioLoadEnd);
      audioElement.addEventListener('error', (e) => {
        handleAudioError(e.target.error);
      });
    }
    return () => {
      if (audioElement) {
        audioElement.removeEventListener('loadstart', handleAudioLoadStart);
        audioElement.removeEventListener('canplay', handleAudioLoadEnd);
        audioElement.removeEventListener('error', (e) => handleAudioError(e.target.error));
      }
    };
  }, [handleAudioLoadStart, handleAudioLoadEnd, handleAudioError]);

  // NEW: Clear loading spinner when audio is playing
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handlePlaying = () => {
      setIsLoading(false);
    }
    audio.addEventListener('playing', handlePlaying);
    return () => {
      audio.removeEventListener('playing', handlePlaying);
    };
  }, [audioRef]);

  // NEW: Trigger scoreboard animation sequence on a correct guess
  useEffect(() => {
    if (correctGuess) {
      // 1. Flip out at top position
      setScoreboardAnimationStage('flip-out-center');
      document.querySelector('.audio-player').classList.add('flip-out');
      
      // 2. Once flipped out, move to center position and start flip in
      setTimeout(() => {
        setScoreboardAnimationStage('centered flip-in-center');
        
        setTimeout(() => {
          setScoreboardInMiddle(true);

          // 3. After being visible in center, flip out
          setTimeout(() => {
            setScoreboardAnimationStage('centered flip-out-top');
            
            // 4. Once flipped out in center, move back to top and flip in
            setTimeout(() => {
              setScoreboardAnimationStage('top flip-in-top');
              
              // 5. Only show continue button after scoreboard animation is complete
              setTimeout(() => {
                setScoreboardAnimationStage('');
                setScoreboardInMiddle(false);
                // Show continue button after everything else is done
                document.querySelector('.continue-button').classList.add('flip-in');
              }, 500);
            }, 500);
          }, 3000);
        }, 500);
      }, 500);
    }
  }, [correctGuess]);

  // NEW: Automatically load station when radioStation changes
  useEffect(() => {
    if (radioStation && audioRef.current) {
      // Use resolved URL if available, fallback to radioStation.url
      audioRef.current.src = radioStation.url_resolved || radioStation.url;
      audioRef.current.load(); // Trigger buffering/loading
      console.log(`Loading station: ${radioStation.name}`);
    }
  }, [radioStation]);

  // Add this useEffect to handle animations after the round summary modal appears
  useEffect(() => {
    if (showRoundModal) {
      // Play reveal sound
      if (window.gameSounds?.reveal) {
        window.gameSounds.reveal.play().catch(() => {});
      }
      
      // Set a small timeout to ensure DOM is ready
      setTimeout(() => {
        // Execute score counter animation
        const scoreValue = document.querySelector('.metric-value');
        if (scoreValue) {
          // Set the initial number value
          let startValue = 0;
          // Get the target value from the dataset or the DOM content
          const endValue = parseInt(scoreValue.getAttribute('data-value') || roundResults[currentRound - 1]?.score, 10);
          // Duration of the count animation in milliseconds
          const duration = 1500;
          // Start time reference
          let startTime = null;
          
          // Animation function for counting up
          const countUp = (timestamp) => {
            if (!startTime) startTime = timestamp;
            // Calculate progress
            const progress = Math.min((timestamp - startTime) / duration, 1);
            // Calculate current count value
            const currentValue = Math.floor(progress * endValue);
            // Update the displayed value
            scoreValue.textContent = currentValue;
            
            // Continue animation if not complete
            if (progress < 1) {
              requestAnimationFrame(countUp);
            } else {
              // Ensure final value is exact
              scoreValue.textContent = endValue;
              
              // Play success sound on completion
              if (window.gameSounds?.click) {
                window.gameSounds.click.play().catch(() => {});
              }
            }
          };
          
          // Start the animation
          requestAnimationFrame(countUp);
        }
        
        // Apply score bar animation
        const scoreBar = document.querySelector('.score-bar');
        if (scoreBar) {
          const scorePercent = Math.min(roundResults[currentRound - 1]?.score / 50, 100);
          scoreBar.style.width = `${scorePercent}%`;
        }
        
        // Apply attempts bar animation
        const attemptsBar = document.querySelector('.attempts-bar');
        if (attemptsBar) {
          const attemptsPercent = Math.min(roundResults[currentRound - 1]?.attempts * 10, 100);
          attemptsBar.style.width = `${attemptsPercent}%`;
        }
        
        // Add shine animation to flag image
        const flagReveal = document.querySelector('.flag-reveal');
        if (flagReveal) {
          flagReveal.addEventListener('load', () => {
            // Flag reveal animation happens automatically via CSS now
          });
        }
        
        // Add click sound for game controls
        const interactives = document.querySelectorAll('.game-continue-button, .journey-header, .retro-button');
        interactives.forEach(element => {
          element.addEventListener('click', () => {
            if (window.gameSounds?.click) {
              // Clone and play to allow overlapping sounds
              const sound = window.gameSounds.click.cloneNode();
              sound.volume = 0.1;
              sound.play().catch(() => {});
            }
          });
        });

        // Add journey toggle interaction
        const journeyHeader = document.querySelector('.journey-header');
        const journeyContent = document.querySelector('.journey-content');
        
        if (journeyHeader && journeyContent) {
          journeyHeader.addEventListener('click', () => {
            journeyContent.classList.toggle('expanded');
            journeyHeader.classList.toggle('active');
          });
        }
        
        // Trigger flag shine animation
        const flagShine = document.querySelector('.flag-shine');
        if (flagShine) {
          // Already handled by CSS animation
        }
        
      }, 100);
    }
  }, [showRoundModal, currentRound, roundResults]);

  // Add this effect to initialize game sounds
  useEffect(() => {
    // Create a sound effects system
    const sounds = {
      success: new Audio(`${import.meta.env.BASE_URL}audio/success.mp3`),
    };
    
    // Set volume for all sounds
    Object.values(sounds).forEach(sound => {
      sound.volume = 0.2;
    });
    
    // Special case for success which should be louder
    sounds.success.volume = 0.3;
    
    // Store in window for easy access
    window.gameSounds = sounds;
    
    // Pre-load sounds by triggering them silently
    for (const sound of Object.values(sounds)) {
      sound.muted = true;
      sound.play().catch(() => {});
      sound.pause();
      sound.currentTime = 0;
      sound.muted = false;
    }
    
    return () => {
      // Clean up sounds
      for (const sound of Object.values(sounds)) {
        sound.pause();
        sound.src = '';
      }
      delete window.gameSounds;
    };
  }, []);

  return (
    <div className="globe-container">
      {/* Updated overlay: apply animation to entire overlay */}
      <div className={`overlay ${scoreboardAnimationStage}`}>
        <div className="stats-container">
          <div className="stat-item">
            <span className="stat-label">SCORE</span>
            {/* UPDATED: Use animatedScore for smooth score transition */}
            <span className="stat-value">{animatedScore}</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-label">ROUND</span>
            <span className="stat-value">{currentRound}<span className="stat-max">/5</span></span>
          </div>
        </div>
        <div>{feedback}</div>
      </div>

      {/* Custom Audio Player */}
      {radioStation && (
        <div className="audio-player">
          <button onClick={toggleAudio} className="audio-btn">
            {audioPlaying ? 'Pause' : 'Play'}
          </button>
          <span className="audio-instructions">
            {audioPlaying ? 'Adjust volume:' : 'Click Play if audio does not start.'}
          </span>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={volume} 
            onChange={onVolumeChange}
            className="volume-slider"
          />
          {/* Add loading indicator */}
          {isLoading && <div className="loading-spinner"></div>}
          <audio 
            ref={audioRef} 
            muted={false}   // NEW: Ensure audio is unmuted on play
            style={{ display: 'block' }}  // NEW: Make it visible for debugging (or remove to show custom player)
            onError={(e) => handleAudioError(e.target.error)}
          />
          {/* Always-visible clickable refresh message */}
          <div 
            className="radio-error" 
            onClick={startNewRound}
          >
            Station broken? Click here to refresh.
          </div>
        </div>
      )}

      {/* Globe Component */}
      <Globe
        ref={globeEl}
        width={width}
        height={height}
        globeMaterial={globeMaterial}
        backgroundColor="rgba(0,0,0,0)"
        polygonsData={countriesData}
        polygonCapColor={(d) => {
          const polygonId = d.properties?.iso_a2 || d.properties?.name || d.id;
          // ...existing guess color logic...
          const guess = guesses.find((g) => g.id === polygonId);
          if (guess) return guess.color;
          
          // Handle mobile selection only if we have a selected country
          if (isMobile && selectedCountry?.polygonId === polygonId) return '#ffeb3b';
          
          // Default color for all other cases
          return '#4CAF50';
        }}
        polygonStrokeColor={d => {
          if (correctGuess && targetCountry && d.id === targetCountry.id) {
            return '#000000';  // black stroke for correct country
          }
          return '#1B5E20';  // darker green stroke for better visibility
        }}
        polygonSideColor={d => {
          if (correctGuess && targetCountry && d.id === targetCountry.id) {
            return "#000000";  // solid color for sides when correct
          }
          return "#2E7D32";  // slightly darker green for sides
        }}
        polygonStrokeWidth={0.5}  // Increased stroke width
        polygonAltitude={d => {
          const polygonId = d.properties?.iso_a2 || d.properties?.name || d.id;
          const guess = guesses.find((g) => g.id === polygonId);
          if (guess && guess.altitude !== undefined) {
            return guess.altitude;
          }
          if (correctGuess && targetCountry && d.id === targetCountry.id) {
            return 0.02;  // extrude correct country
          }
          return 0.01;  // slight elevation for all countries to show borders
        }}
        polygonLabel={(d) => isMobile ? null : `
          <span style="
            font-size: 18px; 
            font-weight: bold; 
            font-family: 'Regular', sans-serif;
            color: white;
            padding: 0px;
            text-align: center;
          ">
            ${d.properties?.name || d.id || 'Unknown'}
          </span>
        `}
        onPolygonClick={onPolygonClick}
        polygonsTransitionDuration={300}
      />

      {/* Only show confirmation button on mobile */}
      {isMobile && selectedCountry && (
        <button 
          className="confirm-button visible"
          onClick={() => handleConfirmGuess()}
        >
          Confirm {selectedCountry.properties?.name}
        </button>
      )}

      {/* Add new continue button (initially hidden) */}
      {correctGuess && (
        <button 
          className={`continue-button ${continueFading ? "flip-out" : ""}`}
          onClick={handleContinue}
        >
          Continue
        </button>
      )}

      {/* Start modal card overlay - Minimalist */}
        {!gameStarted && (
          <div className="modal-overlay">
            <div className="start-modal-card">
              {/* Header */}
              <div className="start-header">
                <span className="start-icon">🌍</span>
                <h1 className="start-title">GeoRadio</h1>
              </div>

              {/* Simple Instructions */}
              <p className="start-text">
                Listen to a radio station and guess which country it&apos;s from.
              </p>
              
              {/* Color Legend - Essential for understanding feedback */}
              <div className="color-legend">
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#b83700' }}></div>
                  <span>Very close!</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#fe7835' }}></div>
                  <span>Getting warmer</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ backgroundColor: '#fef2dc', border: '1px solid #e2e8f0' }}></div>
                  <span>Cold</span>
                </div>
              </div>

              {/* CTA Button */}
              <button className="start-game-btn" onClick={onGameStart}>
                Play
              </button>

              {/* Credits - Minimal footer */}
              <div className="start-credits">
                <span>Inspired by <a href="https://globle-game.com/" target="_blank" rel="noopener noreferrer">Globle</a></span>
              </div>
            </div>
          </div>
        )}

        {/* Round Summary Modal - Simplified */}
      {showRoundModal && (
        <div className={`modal-overlay ${modalClosing ? 'closing' : ''}`}>
          <div className={`round-summary-modal ${modalClosing ? 'closing' : ''}`}>
            {/* Country Reveal - Primary Focus */}
            <div className="country-reveal">
              <div className="country-flag-wrapper">
                <img 
                  src={preloadedFlagUrl || `https://flagcdn.com/w640/${getCountryCode(targetCountry)}.png`}
                  alt={roundResults[currentRound - 1]?.target}
                  onError={handleFlagError}
                  className="country-flag-img"
                />
              </div>
              <h2 className="country-name-title">{roundResults[currentRound - 1]?.target || 'Unknown'}</h2>
              <div className="round-score-inline">
                +{roundResults[currentRound - 1]?.score || 0} points
              </div>
            </div>
            
            {/* Primary Action */}
            <button 
              className="round-continue-btn"
              onClick={handleNextRound}
            >
              {currentRound < 5 ? 'Next Round' : 'See Results'}
            </button>
          </div>
        </div>
      )}

      {/* Game Over Modal - Simplified */}
      {gameOver && (
        <div className={`modal-overlay ${modalClosing ? 'closing' : ''}`}>
          <div className={`game-complete-modal ${modalClosing ? 'closing' : ''}`}>
            {/* Final Score - Hero Element */}
            <div className="final-score-hero">
              <div className="final-score-number">{score}</div>
              <div className="final-score-label">points</div>
            </div>
            
            {/* Rounds Summary - Visual List */}
            <div className="rounds-summary">
              <div className="rounds-list">
                {roundResults.map(result => (
                  <div key={result.round} className="round-summary-item">
                    <div className="round-summary-left">
                      <img 
                        src={`https://flagcdn.com/w80/${getCountryCode(countriesData.find(c => 
                          c.properties?.name === result.target))}.png`}
                        alt={result.target}
                        onError={handleFlagError}
                        className="round-summary-flag"
                      />
                      <span className="round-summary-country">{result.target}</span>
                    </div>
                    <div className="round-summary-score">+{result.score}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Primary Action */}
            <button 
              className="play-again-btn"
              onClick={playAgain}
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

