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

function App() {
  const { width, height } = useWindowSize();
  const globeEl = useRef();
  const audioRef = useRef(null);

  const [countriesData, setCountriesData] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [targetCountry, setTargetCountry] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
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


  /* Start a New Round: Now fetches a random radio station and sets the target country */
  const startNewRound = useCallback(() => {
    if (!countriesData.length || !allStations) return;
    
    // Reset audio state first
    setAudioPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }

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
        return stations.length >= 2 && uniqueCountries.size > 0;
      })
      .map(([lang]) => lang);

    if (validLanguages.length === 0) {
      console.error('No valid languages available');
      setFeedback("No valid stations available!");
      return;
    }

    // 3. Pick random language from valid ones
    const randomLanguage = validLanguages[Math.floor(Math.random() * validLanguages.length)];
    const stationsInLanguage = stationsByLanguage[randomLanguage];

    // Log selected language and available countries
    console.log('DEBUG - Selected language:', randomLanguage);

    // 4. Get available countries that: 
    // a) Have stations in this language
    // b) Haven't been used yet
    const availableCountries = [...new Set(stationsInLanguage.map(s => s.sourceCountry))]
      .filter(country => !usedCountries.includes(country.toLowerCase()));

    if (!availableCountries.length) {
      console.error('No available countries for language:', randomLanguage);
      setFeedback("No more countries available for this language!");
      return;
    }

    // Log available countries
    console.log('DEBUG - Available countries:', availableCountries);

    // 5. Pick random country from those available
    const randomCountry = availableCountries[Math.floor(Math.random() * availableCountries.length)];
    
    // 6. Find target country in map data
    const target = countriesData.find(
      feature => {
        const featureName = (feature.properties?.name || "").toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, "");
        const targetName = randomCountry.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, "");
        return featureName === targetName;
      }
    );

    if (!target) {
      console.error('Could not find target country in map data:', randomCountry);
      // Try next country
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
  }, [countriesData, usedCountries, allStations]);

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
    if (showRoundModal || gameOver) return;
    if (!targetCountry) return;
    
    console.log('DEBUG - Guess:', {
      guessed: feature.properties?.name,
      target: targetCountry.properties?.name
    });
    
    if (guesses.some((g) => g.id === feature.id)) return;
  
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
      id: feature.id, 
      name: guessedName, 
      distance, 
      color: getColor(distance), 
      countryCode: getCountryCode(feature)
    };
    
    if (distance < 50) {
      logEvent('game', 'correct_guess', `Round ${currentRound}: ${targetCountry.properties?.name}`);
      const targetName = targetCountry.properties?.name || targetCountry.id || 'Unknown';
      const baseScore = 5000;
      const roundScore = Math.max(baseScore - ((newAttempts - 1) * 573), 0);
      newFeedback = `Correct! The target was ${targetName}.`;
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
      
      // Delay showing modal
      setTimeout(() => setShowRoundModal(true), 0);
  
      const stationCountry = radioStation?.country
        ?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
      if (stationCountry && !usedCountries.includes(stationCountry)) {
        console.log('DEBUG: Marking correct country used:', stationCountry);
        setUsedCountries((prev) => [...prev, stationCountry]);
      }
    }
    
    setAttempts(newAttempts);
    setScore(updatedScore);
    setFeedback(newFeedback);
    setGuesses(prevGuesses => [...prevGuesses, newGuess]);
  };

  /* Handler to move to the next round */
  const handleNextRound = () => {
    // ...existing code...
    if (currentRound < 5) {
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
    // ...existing code...
    logEvent('game', 'replay', 'Game replayed');
    setCurrentRound(1);
    setRoundResults([]);
    setGameOver(false);
    setFeedback("");
    setAttempts(0);
    setScore(0);
    setGuesses([]);
    setUsedCountries([]); // Clear used countries for a fresh start
    startNewRound();
  };

  // Helper to mimic "Station broken?" button
  const saveBrokenStation = async (station) => {
    try {
      // Log to analytics silently
      logEvent('station', 'broken', `${station.name} (${station.country}) - ${station.url_resolved}`);

      // Append to broken-stations.json via backend API
      const report = {
        name: station.name,
        country: station.country, 
        url: station.url_resolved,
        language: station.language,
        timestamp: new Date().toISOString()
      };

      // Fire and forget - don't await or handle response
      fetch('/api/broken-station', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      }).catch(() => {}); // Silently ignore any errors
    } catch (err) {
      // Silently continue even if reporting fails
      console.debug('Failed to report broken station:', err);
    }
  };

  // Modify callStationBroken to be simpler
  const callStationBroken = useCallback(() => {
    if (radioStation) {
      saveBrokenStation(radioStation);
    }
    startNewRound(); // Just get a new station immediately
  }, [radioStation, startNewRound]);

  // Wrap handleAudioError in useCallback
  const handleAudioError = useCallback((error) => {
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

  // Custom audio play/pause handler
  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((e) => {
        if (!(e.message && e.message.includes("aborted"))) {
          console.error("Audio playback error in toggleAudio:", e);
          // Automatically fetch a new station on failure
          callStationBroken();
        }
        // Silently ignore aborted errors.
      });
    }
    setAudioPlaying(!audioPlaying);
  };

  // Volume change handler
  const onVolumeChange = (e) => {
    const vol = Number(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol / 100;
    }
  };

  // Update game start to include better audio setup
  const onGameStart = () => {
    // ...existing code...
    logEvent('game', 'start', 'New game started');
    setGameStarted(true);
    startNewRound(); // explicitly start the first round
    
    // More robust initial audio setup with retries
    const attemptPlay = (retryCount = 0) => {
      if (retryCount > 2) {
        console.log("Failed to play initial audio, trying new station...");
        callStationBroken();
        return;
      }

      setTimeout(() => {
        if (audioRef.current && radioStation) {
          audioRef.current.play()
            .then(() => {
              setAudioPlaying(true);
              setFeedback("");
            })
            .catch(() => {  // Removed unused 'e' parameter
              console.log(`Retry ${retryCount + 1} failed, trying again...`);
              attemptPlay(retryCount + 1);
            });
        } else {
          // If audio element or station not ready, retry
          attemptPlay(retryCount + 1);
        }
      }, 500); // Increased delay to ensure audio is properly loaded
    };

    attemptPlay();
  };

  return (
    <div className="globe-container">
      {/* Game Overlay UI */}
      <div className="overlay">
        <h1>GeoRadio</h1>
        <div className="stats-container">
          <div className="stat-item">
            <span className="stat-label">SCORE</span>
            <span className="stat-value">{score}</span>
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
          {/* Hidden audio element; onError can remain or be removed */}
          <audio 
            ref={audioRef} 
            style={{ display: 'none' }} 
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
        polygonCapColor={(d) => guesses.find((g) => g.id === d.id)?.color || '#4CAF50'}
        polygonSideColor={() => 'rgba(76, 175, 80, 0.3)'}
        polygonStrokeColor={() => '#388E3C'}
        polygonLabel={(d) => `
          <span style="
            font-size: 18px; 
            font-weight: bold; 
            font-family: Arial, sans-serif; 
            color: white;
            padding: 0px; /* Remove padding if not needed */
            text-align: center;
          ">
            ${d.properties?.name || d.id || 'Unknown'}
          </span>
        `}
        
        onPolygonClick={onPolygonClick}
        polygonsTransitionDuration={300}
      />

      {/* Start modal card overlay */}
      {!gameStarted && (
        <div className="start-modal">
          <div className="modal-card">
            <h2>Welcome to GeoRadio</h2>
            
            <section className="modal-section">
              <h3>How to Play</h3>
              <p>Listen to live radio stations and guess their country of origin by clicking on the globe. You have 5 rounds to score as many points as possible, with each round starting at 5000 points. Your score decreases with each incorrect guess, so choose wisely! After each guess, you&apos;ll be told if you&apos;re getting &quot;warmer&quot; or &quot;colder&quot; compared to your previous guess.</p>
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

      {/* Round Summary Modal */}
      {showRoundModal && (
        <div className="start-modal">
          <div className="modal-card summary-card">
            <h2>Round {currentRound} Complete!</h2>
            
            <div className="summary-station">
              <p>You were listening to:</p>
              <a 
                href={radioStation.homepage || radioStation.url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="station-link"
              >
                {radioStation.name || 'Unknown Station'}
              </a>
            </div>

            <div className="summary-stats">
              <p>It took you <span className="highlight">{roundResults[currentRound - 1]?.attempts} attempts</span> to find the correct country, earning you <span className="highlight">{roundResults[currentRound - 1]?.score} points</span>!</p>
            </div>

            <div className="guesses-list">
              <div className="guesses-container">
                {guesses.map((guess, index) => (
                  <div key={index} className="guess-item">
                    <img 
                      src={`https://flagcdn.com/w80/${guess.countryCode}.png`}  // Changed from w20 to w80
                      alt=""
                      onError={(e) => {
                        e.target.src = 'https://flagcdn.com/w80/un.png';  // Update fallback too
                        console.log('Flag not found for:', guess);
                      }}
                      className="country-flag"
                    />
                    <span>{guess.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={handleNextRound}>
              {currentRound < 5 ? 'Next Round' : 'See Final Results'}
            </button>
          </div>
        </div>
      )}

      {/* Final Game Summary Modal */}
      {gameOver && (
        <div className="start-modal">
          <div className="modal-card">
            <h2>Game Over</h2>
            <p className="final-score">
              You scored <span className="score-highlight">{score}</span> points!
            </p>
            <h3 className="recap-header">Here is your recap</h3>
            <div className="final-recap" style={{ maxHeight: '300px', overflowY: 'auto', margin: '16px 0' }}>
              {roundResults.map(result => (
                <div 
                  key={result.round} 
                  className="round-item"
                  style={{ 
                    marginBottom: '16px', 
                    padding: '8px', 
                    border: '2px solid #ccc', // updated border color to grey
                    borderRadius: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.4)'
                  }}
                >
                  <h4>Round {result.round}</h4>
                  <div className="summary-station">
                    <p>You were listening to:</p>
                    <a 
                      href={result.stationUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="station-link"
                    >
                      {result.stationName}
                    </a>
                  </div>
                  <div className="summary-stats">
                    <p>
                      It took you <span className="highlight">{result.attempts}</span> attempts, which earned you <span className="highlight">{result.score}</span> points!
                    </p>
                  </div>
                  <div className="guesses-list">
                    <div className="guesses-container">
                      {result.guesses.map((guess, index) => (
                        <div key={index} className="guess-item">
                          <img 
                            src={`https://flagcdn.com/w80/${guess.countryCode}.png`}  // Changed from w20 to w80
                            alt=""
                            onError={(e) => {
                              e.target.src = 'https://flagcdn.com/w80/un.png';  // Update fallback too
                            }}
                            className="country-flag"
                          />
                          <span>{guess.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={playAgain}>Play Again</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;


