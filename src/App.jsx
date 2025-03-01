import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import Globe from 'react-globe.gl';
import { feature } from 'topojson-client';
import * as THREE from 'three';
import './index.css';
import './app.css';
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
  const [isLoading, setIsLoading] = useState(false);
  // NEW: Add state for triggering scoreboard animation
  const [scoreboardAnimationStage, setScoreboardAnimationStage] = useState('');
  // NEW: State to track when the scoreboard is in the middle
  const [scoreboardInMiddle, setScoreboardInMiddle] = useState(false);

  // Initialize GA when app loads
  useEffect(() => {
    initGA();
    logPageView();
  }, []);

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
      countryCode: getCountryCode(feature)
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
    setGuesses(prevGuesses => [...prevGuesses, newGuess]);

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
      
      setCurrentRound(currentRound + 1);
      setShowRoundModal(false);
      setAttempts(0);
      setGuesses([]);
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
      // Flip in audio player - only when continuing to next round
      audioPlayer.classList.add('flip-in-reset');
      setTimeout(() => {
        audioPlayer.classList.remove('flip-in-reset');
      }, 500);
    } else {
      logEvent('game', 'game_over', `Final score: ${score}`);
      setShowRoundModal(false);
      setGameOver(true);
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

    // ...existing playAgain code...
    logEvent('game', 'replay', 'Game replayed');
    setCurrentRound(1);
    setRoundResults([]);
    setGameOver(false);
    setFeedback("");
    setAttempts(0);
    setScore(0);
    setAnimatedScore(0);
    setGuesses([]);
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
          return '#388E3C';  // default green stroke for other countries
        }}
        polygonSideColor={d => {
          if (correctGuess && targetCountry && d.id === targetCountry.id) {
            return "#000000";  // solid color for sides when correct
          }
          return "rgba(76, 175, 80, 0.1)";  // very light transparency for other countries
        }}
        polygonAltitude={d => {
          if (correctGuess && targetCountry && d.id === targetCountry.id) {
            return 0.02;  // extrude correct country
          }
          return 0.01;  // slight elevation for all countries to show borders
        }}
        polygonLabel={(d) => isMobile ? null : `
          <span style="
            font-size: 18px; 
            font-weight: bold; 
            font-family: Arial, sans-serif; 
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

      {/* Start modal card overlay */}
        {!gameStarted && (
          <div className="start-modal">
            <div className="modal-card">
          <h2>Welcome to GeoRadio</h2>
          
          <section className="modal-section">
            <h3>How to Play</h3>
            <p>Listen to live radio stations and guess their country of origin by clicking countries on the globe. 
            <strong> Keep guessing</strong> until you find the right one! After each guess, the country will be colored:</p>
            <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', backgroundColor: '#b83700', borderRadius: '4px' }}></div>
            <span>Dark red = Very close!</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', backgroundColor: '#fe7835', borderRadius: '4px' }}></div>
            <span>Orange = Getting warmer</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '20px', height: '20px', backgroundColor: '#fef2dc', borderRadius: '4px' }}></div>
            <span>White = Very cold</span>
              </div>
            </div>
            <p style={{ marginTop: '10px' }}>You have 5 rounds to score as many points as possible. Each round starts at 5000 points and decreases with every wrong guess. Look for hints in the radio content like language, music style, or announcements!</p>
          </section>

          <section className="modal-section">
            <h3>Disclaimer</h3>
            <p>Audio streams are pulled from a public radio API. Content may occasionally be inappropriate or unavailable.</p>
          </section>

          <div className="credits-container">
            <div className="modal-section credits-section">
              <span>Inspired by <a href="https://globle-game.com/" target="_blank" rel="noopener noreferrer" className="credit-link">Globle</a></span>
            </div>
            <div className="credits-divider"></div>
            <div className="modal-section credits-section">
              <span>Created by <a href="discord://discord.com/users/plutonotfromspace" className="credit-link">PlutoNotFromSpace</a></span>
            </div>
          </div>

          <button onClick={onGameStart}>Start Game</button>
            </div>
          </div>
        )}

        {/* Round Summary Modal - Redesigned */}
      {showRoundModal && (
        <div className="start-modal">
          <div className="modal-card summary-card">
            {/* Simplified header - made smaller and less prominent */}
            <div className="round-badge-solo">#{currentRound}</div>
            
            {/* Enhanced country detection container with higher resolution flag */}
            <div className="country-detection-hero">
              <div className="country-flag-container">
                <img 
                  src={`https://flagcdn.com/w640/${getCountryCode(targetCountry)}.png`}
                  alt={roundResults[currentRound - 1]?.target}
                  onError={(e) => {
                    e.target.src = 'https://flagcdn.com/w640/un.png'
                  }}
                  className="detected-flag"
                />
                <div className="country-name-overlay">
                  <h2 className="country-name">{roundResults[currentRound - 1]?.target}</h2>
                </div>
              </div>
            </div>
            
            {/* Enhanced radio station info */}
            <div className="station-info">
              <div className="station-icon">📻</div>
              <div className="station-details">
                <h3 className="station-name">{radioStation.name || 'Unknown Station'}</h3>
                <a 
                  href={radioStation.homepage || radioStation.url} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="station-url"
                >
                  Listen Online
                </a>
              </div>
            </div>
            
            {/* Score section with visual indicators */}
            <div className="round-stats">
              <div className="stat-box attempts">
                <span className="stat-value">{roundResults[currentRound - 1]?.attempts}</span>
                <span className="stat-label">Attempts</span>
              </div>
              <div className="score-arrow">→</div>
              <div className="stat-box score">
                <span className="stat-value">{roundResults[currentRound - 1]?.score}</span>
                <span className="stat-label">Points</span>
              </div>
            </div>
            
            {/* Enhanced Guess History with improved visual journey */}
            <div className="guesses-section">
              <h4 className="guesses-title">Your Journey</h4>
              <div className="journey-container">
                {guesses.map((guess, index) => (
                  <div key={index} className={`journey-item ${index === guesses.length - 1 ? 'correct-guess' : ''}`}>
                    <div className="journey-header">
                      <span className="journey-number">{index + 1}</span>
                      <span className="journey-name">{guess.name}</span>
                      {index === guesses.length - 1 && <span className="journey-correct">✓ Correct!</span>}
                    </div>
                    <div className="journey-content">
                      <img 
                        src={`https://flagcdn.com/w80/${guess.countryCode}.png`} 
                        alt=""
                        onError={(e) => {
                          e.target.src = 'https://flagcdn.com/w80/un.png'
                        }}
                        className="journey-flag"
                      />
                      <div className="journey-details">
                        {index > 0 && (
                          <div className="journey-distance-change">
                            {guess.distance < guesses[index-1].distance ? (
                              <span className="warmer">Warmer 🔥</span>
                            ) : (
                              <span className="colder">Colder ❄️</span>
                            )}
                          </div>
                        )}
                        <div className="journey-distance">
                          <span className="distance-value">
                            {guess.distance < 100 ? 
                              `${Math.round(guess.distance)} km` : 
                              `${Math.round(guess.distance / 100) / 10} thousand km`}
                          </span>
                          <div 
                            className="distance-bar"
                            style={{
                              background: guess.color,
                              width: `${Math.max(100 - (guess.distance / 150), 10)}%`
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>
                    {index < guesses.length - 1 && <div className="journey-arrow">↓</div>}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Next action button with clearer purpose */}
            <button 
              onClick={handleNextRound}
              className="action-button"
            >
              {currentRound < 5 ? `Continue to Round ${currentRound + 1}` : 'See Final Results'}
            </button>
          </div>
        </div>
      )}

      {/* Final Game Summary Modal - Completely Redesigned */}
      {gameOver && (
        <div className="start-modal">
          <div className="modal-card game-over-card">
            {/* Trophy and Confetti Animation */}
            <div className="trophy-container">
              <div className="trophy-icon">🏆</div>
              <div className="confetti-piece left"></div>
              <div className="confetti-piece right"></div>
            </div>
            
            <h2 className="game-over-title">Game Complete!</h2>
            
            {/* Final score with prominent display */}
            <div className="final-score-container">
              <div className="final-score-label">FINAL SCORE</div>
              <div className="final-score-value">{score}</div>
              <div className="score-decoration">
                <div className="score-line"></div>
                <div className="score-star">★</div>
                <div className="score-line"></div>
              </div>
            </div>
            
            {/* Performance rating based on score */}
            <div className="performance-rating">
              {score >= 20000 ? "Globe Master!" : 
               score >= 15000 ? "Geography Expert!" : 
               score >= 10000 ? "World Traveler!" : 
               score >= 5000 ? "Radio Explorer!" : 
               "Novice Listener!"}
            </div>
            
            {/* Round Journey Summary with Improved Visual Design */}
            <h3 className="journey-title">Your Radio Journey</h3>
            
            <div className="game-journey">
              {roundResults.map(result => (
                <div key={result.round} className="journey-round">
                  <div className="journey-round-header">
                    <div className="round-country">
                      {/* Flag and country name in header */}
                      <img 
                        src={`https://flagcdn.com/w160/${getCountryCode(countriesData.find(c => 
                          c.properties?.name === result.target))}.png`}
                        alt={result.target}
                        onError={(e) => {
                          e.target.src = 'https://flagcdn.com/w160/un.png'
                        }}
                        className="round-flag"
                      />
                      <h4>{result.target}</h4>
                    </div>
                    <div className="round-score">{result.score}</div>
                  </div>
                  
                  <div className="round-details">
                    <div className="station-info">
                      <div className="station-icon">📻</div>
                      <div className="station-name-container">
                        <span className="station-name">{result.stationName}</span>
                        <a 
                          href={result.stationUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="station-link"
                        >
                          Visit Station
                        </a>
                      </div>
                    </div>
                    
                    <div className="guesses-summary">
                      <div className="guesses-count">
                        <span className="count-number">{result.attempts}</span>
                        <span className="count-label">Guesses</span>
                      </div>
                      
                      <div className="guess-flags">
                        {result.guesses.slice(0, 5).map((guess, index) => (
                          <div key={index} className={`mini-flag ${index === result.guesses.length - 1 ? 'correct-flag' : ''}`}>
                            <img 
                              src={`https://flagcdn.com/w80/${guess.countryCode}.png`}
                              alt={guess.name}
                              onError={(e) => {
                                e.target.src = 'https://flagcdn.com/w80/un.png'
                              }}
                              title={guess.name}
                            />
                            {index === result.guesses.length - 1 && (
                              <div className="correct-marker">✓</div>
                            )}
                          </div>
                        ))}
                        {result.guesses.length > 5 && (
                          <div className="more-flags">+{result.guesses.length - 5}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Action buttons with clearer hierarchy */}
            <div className="game-over-actions">
              <button onClick={playAgain} className="primary-button">
                Play Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

