import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { useSpring, animated } from '@react-spring/web';
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
// Modal components
import GameCompleteModal from './components/GameCompleteModal';
// Coaching tooltip for first-guess onboarding
import CoachingTooltip from './components/CoachingTooltip';
// Globe transition animation hook
import { useGlobeTransition } from './hooks/useGlobeTransition';

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

/* ──────────────────────────────────────────────────
   ScoreCounter — Live round-score HUD (GeoGuessr-style health bar)
   Sits top-right, shows 5000 draining on wrong guesses.
   Uses @react-spring/web for spring-physics number animation.
   ────────────────────────────────────────────────── */
const POINTS_PER_ROUND = 5000;
const PENALTY_PER_GUESS = 573;

/* eslint-disable react/prop-types */
function ScoreCounter({ attempts, roundFailed, damageKey, visible }) {
  const [mounted, setMounted] = useState(visible);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setExiting(false);
    } else if (mounted) {
      setExiting(true);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const roundScore = Math.max(POINTS_PER_ROUND - (attempts * PENALTY_PER_GUESS), 0);
  const barPercent = (roundScore / POINTS_PER_ROUND) * 100;
  const isCritical = roundScore > 0 && roundScore <= PENALTY_PER_GUESS;

  // Spring-animated number — rolls down with overshoot on each wrong guess
  const { displayScore } = useSpring({
    displayScore: roundScore,
    config: { tension: 300, friction: 22 },
  });

  // Bar color interpolation: green (100%) → orange (50%) → red (0%)
  const barColor = barPercent > 60
    ? 'var(--gg-green-50)'
    : barPercent > 30
      ? 'var(--gg-orange-50)'
      : 'var(--gg-red-50)';

  if (!mounted) return null;

  return (
    <div
      className={[
        'score-counter',
        exiting ? 'score-counter--exit' : '',
        damageKey > 0 && !exiting ? 'score-counter--hit' : '',
        isCritical ? 'score-counter--critical' : '',
        roundFailed ? 'score-counter--failed' : '',
      ].filter(Boolean).join(' ')}
      /* Re-trigger shake by toggling key on each hit */
      key={`sc-${damageKey}`}
      onAnimationEnd={(e) => {
        if (e.animationName === 'hudExit') {
          setMounted(false);
          setExiting(false);
        }
      }}
    >
      {/* Bar track + fill */}
      <div className="score-counter__track">
        <div
          className="score-counter__fill"
          style={{ width: `${barPercent}%`, background: barColor }}
        />
      </div>

      {/* Animated numeric score */}
      <animated.span className="score-counter__number">
        {displayScore.to(v => Math.round(v).toLocaleString())}
      </animated.span>

      {/* Floating damage text — re-mounts on each wrong guess via key */}
      {damageKey > 0 && (
        <span className="score-counter__damage" key={`dmg-${damageKey}`}>
          −{PENALTY_PER_GUESS}
        </span>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────
   RoundIndicator — Round progress HUD (top-left)
   Shows "Round X" + 5 pip dots colour-coded by outcome.
   Mirrors ScoreCounter's glass-pill aesthetic.
   ────────────────────────────────────────────────── */
function RoundIndicator({ currentRound, roundResults, visible }) {
  const [mounted, setMounted] = useState(visible);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setExiting(false);
    } else if (mounted) {
      setExiting(true);
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;

  const pips = Array.from({ length: 5 }, (_, i) => {
    const roundNum = i + 1;
    const result = roundResults[i];
    let cls = 'round-indicator__pip';
    if (result) {
      cls += result.score > 0 ? ' round-indicator__pip--passed' : ' round-indicator__pip--failed';
    } else if (roundNum === currentRound) {
      cls += ' round-indicator__pip--current';
    } else {
      cls += ' round-indicator__pip--upcoming';
    }
    return <span key={roundNum} className={cls} />;
  });

  return (
    <div
      className={`round-indicator${exiting ? ' round-indicator--exit' : ''}`}
      onAnimationEnd={(e) => {
        if (e.animationName === 'hudExit') {
          setMounted(false);
          setExiting(false);
        }
      }}
    >
      <span className="round-indicator__label">Round {currentRound}</span>
      <div className="round-indicator__pips">{pips}</div>
    </div>
  );
}
/* eslint-enable react/prop-types */

function App() {
  const { width, height } = useWindowSize();
  const globeEl = useRef();
  const { spinTransition, resetToDefault } = useGlobeTransition(globeEl);
  const audioRef = useRef(null);
  // Web Audio API refs for waveform visualization
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const colorAnimationTimers = useRef([]);  // Track setTimeout IDs for color animations
  const tremorTimers = useRef([]);           // Track globe tremor setTimeout IDs
  const controlsLockTimer = useRef(null);    // Track controls re-enable timeout

  // Lock/unlock globe drag during camera animations
  const lockControls = useCallback((durationMs) => {
    if (!globeEl.current) return;
    const controls = globeEl.current.controls();
    if (!controls) return;
    controls.enableRotate = false;
    controls.enableZoom = false;
    controls.enablePan = false;
    // Clear any pending unlock
    if (controlsLockTimer.current) clearTimeout(controlsLockTimer.current);
    controlsLockTimer.current = setTimeout(() => {
      if (!globeEl.current) return;
      const c = globeEl.current.controls();
      if (c) {
        c.enableRotate = true;
        c.enableZoom = true;
        c.enablePan = true;
      }
    }, durationMs);
  }, []);

  const [countriesData, setCountriesData] = useState([]);
  const [guesses, setGuesses] = useState([]);
  const [hoveredPolygonId, setHoveredPolygonId] = useState(null);
  const [targetCountry, setTargetCountry] = useState(null);
  const [attempts, setAttempts] = useState(0);
  const [score, setScore] = useState(0);
  const [radioStation, setRadioStation] = useState(null);
  const [, setGameStarted] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [userPausedAudio, setUserPausedAudio] = useState(false);  // Track intentional pause
  const [volume, setVolume] = useState(50); // new state for volume
  const [, setAnalyserReady] = useState(false); // Track if audio analyser is connected
  const [currentRound, setCurrentRound] = useState(1);
  const [roundResults, setRoundResults] = useState([]);
  const [showRoundModal, setShowRoundModal] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [usedCountries, setUsedCountries] = useState([]);
  const [allStations, setAllStations] = useState([]);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectionRing, setSelectionRing] = useState(null);
  const isMobile = width <= 768; // Add this line to detect mobile
  // Add new state for correct guess
  const [correctGuess, setCorrectGuess] = useState(false);
  const [, setContinueFading] = useState(false);
  // Result bar - bottom bar shown after correct guess
  const [showResultBar, setShowResultBar] = useState(false);
  const [animatedRoundScore, setAnimatedRoundScore] = useState(0);
  const [animatedAttempts, setAnimatedAttempts] = useState(0);
  // Modal closing animation states
  const [modalClosing, setModalClosing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioError, setAudioError] = useState(false); // Track audio errors for progressive disclosure
  const audioErrorTimerRef = useRef(null);  // Delayed error button display (3s)
  const stallTimerRef = useRef(null);        // Stall detection timeout (4s)
  const [damageKey, setDamageKey] = useState(0);  // Increments on each wrong guess to trigger CSS animations
  const [roundFailed, setRoundFailed] = useState(false);  // Track if round ended by running out of points
  const [revealPulse, setRevealPulse] = useState(false);  // Toggles for pulsing altitude on failed-round reveal
  const [audioPlayerEntranceComplete, setAudioPlayerEntranceComplete] = useState(false); // Track if audio player entrance animation finished
  // NEW: State for preloaded flag image
  const [, setPreloadedFlagUrl] = useState(null);
  // NEW: Track if first-run experience is complete (user clicked "Tap to tune in")
  const [firstRunComplete, setFirstRunComplete] = useState(false);
  // Ref to store onGameStart callback for first-run experience
  const onGameStartRef = useRef(null);
  // NEW: Track coaching tooltip count (max 3 tooltips for onboarding)
  const [coachingTooltipCount, setCoachingTooltipCount] = useState(0);
  // NEW: Track the last guess distance for warmer/colder comparison
  const [lastGuessDistance, setLastGuessDistance] = useState(null);
  // NEW: Track if user was getting warmer (to show "getting colder" if they reverse)
  const [wasGettingWarmer, setWasGettingWarmer] = useState(false);
  // NEW: Coaching tooltip state - includes lat/lon for globe-locked position
  const [coachingTip, setCoachingTip] = useState({ 
    visible: false, 
    text: '', 
    type: '', // 'hot', 'warm', 'cool', 'cold'
    x: 0, 
    y: 0,
    lat: 0,  // Store lat/lon to update position on globe movement
    lon: 0,
    heatmapColor: null,  // Exact color from getColor() to match country polygon
    isOnVisibleSide: true,  // Whether the country is on the visible side of globe
    id: 0  // Unique ID to trigger animation only on new tooltips
  });

  // Default proxy endpoint path for audio streaming CORS bypass
  const DEFAULT_PROXY_PATH = '/api/proxy';

  /**
   * Helper function to get proxied URL for audio streams
   * Uses VITE_PROXY_BASE_URL env var or falls back to /api/proxy on current origin
   * Only uses proxy in production to avoid CORS issues
   * @param {string} stationUrl - The original station URL
   * @returns {string} The proxied URL (in production) or original URL (in dev)
   */
  const getProxiedUrl = useCallback((stationUrl) => {
    // In development, use direct URLs to avoid proxy issues
    if (import.meta.env.DEV) {
      console.debug('Development mode: using direct URL', stationUrl);
      return stationUrl;
    }
    
    // In production, use the proxy to handle CORS
    const proxyBase = import.meta.env.VITE_PROXY_BASE_URL || 
      `${window.location.origin}${DEFAULT_PROXY_PATH}`;
    const proxiedUrl = `${proxyBase}?url=${encodeURIComponent(stationUrl)}`;
    console.debug('Production mode: using proxied URL', proxiedUrl, '-> original', stationUrl);
    return proxiedUrl;
  }, []);

  /**
   * Helper function to set up audio source with HLS support
   * Centralizes audio setup logic to avoid duplication
   * Routes all audio through the CORS proxy
   */
  const setupAudioSource = useCallback((stationUrl) => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    
    audioElement.crossOrigin = "anonymous";
    
    // Cleanup existing HLS instance
    if (audioElement.hlsInstance) {
      audioElement.hlsInstance.destroy();
      audioElement.hlsInstance = null;
    }
    
    // Get proxied URL for CORS-safe streaming
    const proxiedUrl = getProxiedUrl(stationUrl);
    
    // Setup new source using proxied URL
    if (Hls.isSupported() && stationUrl.endsWith('.m3u8')) {
      const hls = new Hls();
      hls.loadSource(proxiedUrl);
      hls.attachMedia(audioElement);
      audioElement.hlsInstance = hls;
    } else {
      audioElement.src = proxiedUrl;
    }
    
    audioElement.load();
  }, [getProxiedUrl]);

  /**
   * Helper function to cleanup audio resources
   * Centralizes audio cleanup logic to avoid duplication
   */
  const cleanupAudio = useCallback(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    
    audioElement.pause();
    if (audioElement.hlsInstance) {
      audioElement.hlsInstance.destroy();
      audioElement.hlsInstance = null;
    }
  }, []);



  // Initialize GA when app loads
  useEffect(() => {
    initGA();
    logPageView();
  }, []);

  // Set up zoom constraints and splash-mode auto-rotation
  useEffect(() => {
    const setupControls = () => {
      if (globeEl.current) {
        const controls = globeEl.current.controls();
        if (controls) {
          // maxDistance limits how far you can zoom out
          // Globe radius is ~100, altitude 2.5 means camera is at ~350 from center
          controls.maxDistance = 350;  // Prevents zooming out beyond default
          controls.minDistance = 120;  // Allow zooming in close
          
          // During splash: slow auto-rotate, no user interaction
          if (!firstRunComplete) {
            controls.autoRotate = true;
            controls.autoRotateSpeed = 0.4;
            controls.enableRotate = false;
            controls.enableZoom = false;
            controls.enablePan = false;
          }
          return true;
        }
      }
      return false;
    };

    // Try immediately, then retry with a delay if globe not ready
    if (!setupControls()) {
      const timer = setTimeout(setupControls, 500);
      return () => clearTimeout(timer);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Starfield — twinkling stars + audio-reactive effects
  useEffect(() => {
    let stars = null;
    let frameId = null;
    // Smooth audio energy values (persisted across frames)
    let smoothBass = 0;
    let smoothMid = 0;
    let smoothHigh = 0;
    let smoothEnergy = 0;

    const setup = () => {
      if (!globeEl.current) return false;
      const scene = globeEl.current.scene();
      if (!scene) return false;

      const STAR_COUNT = 1800;
      const SPHERE_RADIUS = 800;

      const positions = new Float32Array(STAR_COUNT * 3);
      const baseSizes = new Float32Array(STAR_COUNT);
      const twinkleOffsets = new Float32Array(STAR_COUNT);
      // Pre-assign each star to a frequency band for varied reactivity
      const starBands = new Uint8Array(STAR_COUNT); // 0=bass, 1=mid, 2=high

      for (let i = 0; i < STAR_COUNT; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = SPHERE_RADIUS + (Math.random() - 0.5) * 200;

        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);

        baseSizes[i] = 2.0 + Math.random() * 1.0; // 2–3 screen-space pixels
        twinkleOffsets[i] = Math.random() * Math.PI * 2;
        starBands[i] = Math.floor(Math.random() * 3); // random band assignment
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('aSize', new THREE.BufferAttribute(new Float32Array(baseSizes), 1));

      // Custom shader to support per-star sizes
      const material = new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(0xffffff) },
          uOpacity: { value: 0.85 },
        },
        vertexShader: `
          attribute float aSize;
          varying float vSize;
          void main() {
            vSize = aSize;
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize;
            gl_Position = projectionMatrix * mvPosition;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor;
          uniform float uOpacity;
          varying float vSize;
          void main() {
            float dist = length(gl_PointCoord - vec2(0.5));
            // Large stars (>3px): soft circular glow with discard
            // Small stars: solid square, no discard, no edge fade
            if (vSize > 3.0) {
              if (dist > 0.5) discard;
              float edge = smoothstep(0.3, 0.5, dist);
              gl_FragColor = vec4(uColor, uOpacity * (1.0 - edge));
            } else {
              gl_FragColor = vec4(uColor, uOpacity);
            }
          }
        `,
        transparent: true,
        depthWrite: false,
      });

      stars = new THREE.Points(geometry, material);
      scene.add(stars);

      // Frequency data buffer (reused each frame)
      const freqData = new Uint8Array(32);
      let corsBlocked = false; // detect CORS-tainted source
      let corsCheckFrames = 0;

      const animate = () => {
        const time = performance.now() * 0.001;

        // ─── AUDIO ANALYSIS ──────────────────────────────────
        // Read frequency data if the analyser is connected and audio is playing
        let bass = 0, mid = 0, high = 0, energy = 0;
        const analyser = analyserRef.current;
        const audioEl = audioRef.current;
        const isPlaying = audioEl && !audioEl.paused && audioEl.currentTime > 0;

        if (analyser && !corsBlocked) {
          analyser.getByteFrequencyData(freqData);

          // Check for CORS block: if analyser exists, audio is playing,
          // but all freq data is zero for 60+ frames → CORS is blocking
          if (isPlaying) {
            let allZero = true;
            for (let i = 0; i < 32; i++) {
              if (freqData[i] > 0) { allZero = false; break; }
            }
            if (allZero) {
              corsCheckFrames++;
              if (corsCheckFrames > 60) corsBlocked = true; // confirmed CORS block
            } else {
              corsCheckFrames = 0; // real data flowing, reset
            }
          }

          if (!corsBlocked) {
            // Split 32 bins into 3 bands
            let bassSum = 0, midSum = 0, highSum = 0;
            let bassMax = 0, midMax = 0, highMax = 0;
            for (let i = 0; i < 6; i++) { bassSum += freqData[i]; bassMax = Math.max(bassMax, freqData[i]); }
            for (let i = 6; i < 16; i++) { midSum += freqData[i]; midMax = Math.max(midMax, freqData[i]); }
            for (let i = 16; i < 32; i++) { highSum += freqData[i]; highMax = Math.max(highMax, freqData[i]); }

            bass = (bassSum / (6 * 255) + bassMax / 255) * 0.5;
            mid = (midSum / (10 * 255) + midMax / 255) * 0.5;
            high = (highSum / (16 * 255) + highMax / 255) * 0.5;
            energy = (bass * 0.5 + mid * 0.35 + high * 0.15);
          }
        }

        // ─── SYNTHETIC AUDIO REACTIVITY (CORS fallback) ──────
        // When real frequency data is unavailable (CORS-tainted streams),
        // generate convincing pseudo-reactive values from time + noise
        if ((corsBlocked || !analyser) && isPlaying) {
          const t = time;
          // Layered sine waves at different frequencies to simulate music dynamics
          // Each "band" has its own rhythm to feel like separate instruments
          bass = 0.3 + 0.25 * Math.sin(t * 2.1) + 0.15 * Math.sin(t * 0.7) + 0.1 * Math.sin(t * 4.3);
          mid = 0.25 + 0.2 * Math.sin(t * 3.3 + 1.0) + 0.15 * Math.sin(t * 1.1 + 0.5) + 0.1 * Math.sin(t * 5.7 + 2.0);
          high = 0.15 + 0.15 * Math.sin(t * 5.0 + 2.0) + 0.1 * Math.sin(t * 2.3 + 1.5) + 0.1 * Math.sin(t * 7.1 + 3.0);
          
          // Add stochastic "beats" — occasional spikes
          const beatPhase = (t * 1.8) % 1.0;
          if (beatPhase < 0.08) bass += 0.3 * (1 - beatPhase / 0.08); // sharp attack, fast decay
          
          // Clamp to 0-1
          bass = Math.max(0, Math.min(1, bass));
          mid = Math.max(0, Math.min(1, mid));
          high = Math.max(0, Math.min(1, high));
          energy = bass * 0.5 + mid * 0.35 + high * 0.15;
        }

        // Smooth with exponential moving average (prevents jitter)
        const SMOOTH = 0.25; // faster response to audio changes
        smoothBass += (bass - smoothBass) * SMOOTH;
        smoothMid += (mid - smoothMid) * SMOOTH;
        smoothHigh += (high - smoothHigh) * SMOOTH;
        smoothEnergy += (energy - smoothEnergy) * SMOOTH;

        // Band values for stars (each star uses its assigned band)
        const bandValues = [smoothBass, smoothMid, smoothHigh];

        // ─── STARFIELD ───────────────────────────────────────
        // Constant slow rotation
        stars.rotation.y = time * 0.008;
        stars.rotation.x = Math.sin(time * 0.003) * 0.02;

        // Per-star sizes: only some stars react to music, others stay still
        const sizeAttr = geometry.getAttribute('aSize');
        for (let i = 0; i < STAR_COUNT; i++) {
          const base = baseSizes[i];

          // Small stars stay completely static — no twinkle, no audio
          if (base < 2.5) {
            continue; // already seeded with base size, skip entirely
          }

          const twinkle = Math.sin(time * (1.5 + (i % 5) * 0.3) + twinkleOffsets[i]);
          const twinkleSize = base * (0.8 + 0.2 * (twinkle * 0.5 + 0.5));

          // Only ~30% of stars react to audio (band-assigned), rest just twinkle
          const reactive = (i % 3 === 0);
          if (reactive) {
            const bandBoost = 1 + bandValues[starBands[i]] * 5;
            sizeAttr.array[i] = Math.max(0.8, twinkleSize * bandBoost);
          } else {
            sizeAttr.array[i] = twinkleSize;
          }
        }
        sizeAttr.needsUpdate = true;

        // Star color: shift from white → warm amber/gold on bass hits
        const r = 1.0;
        const g = 1.0 - smoothBass * 0.25;
        const b = 1.0 - smoothBass * 0.5;
        material.uniforms.uColor.value.setRGB(r, g, b);

        // Star opacity: brighter when audio is active
        material.uniforms.uOpacity.value = 0.6 + smoothEnergy * 0.4;

        // (Ocean color is now a fixed vivid blue — no audio reactivity needed)

        // ─── SUN-GLOW PULSE (CSS) ────────────────────────────
        // Drive the ::before pseudo-element opacity via custom property
        const glowScale = 1 + smoothBass * 4; // 1× → 5× at peak bass
        document.documentElement.style.setProperty('--glow-intensity', glowScale);

        frameId = requestAnimationFrame(animate);
      };
      animate();
      return true;
    };

    if (!setup()) {
      const timer = setTimeout(setup, 600);
      return () => clearTimeout(timer);
    }

    const globeRefCopy = globeEl.current;
    return () => {
      if (frameId) cancelAnimationFrame(frameId);
      if (stars && globeRefCopy) {
        const scene = globeRefCopy.scene();
        if (scene) scene.remove(stars);
      }
      // Reset CSS custom property
      document.documentElement.style.removeProperty('--glow-intensity');
    };
  }, []);

  // Ref to track last tooltip position to avoid unnecessary re-renders
  const lastTooltipPosRef = useRef({ x: 0, y: 0 });
  // Ref to track last visibility state
  const lastTooltipVisibilityRef = useRef(true);
  
  // Helper function to check if a point is on the visible hemisphere of the globe
  const isPointOnVisibleHemisphere = (lat, lon) => {
    if (!globeEl.current) return false;
    
    const pov = globeEl.current.pointOfView();
    if (!pov) return false;
    
    // Convert degrees to radians
    const toRad = deg => deg * Math.PI / 180;
    
    const lat1 = toRad(pov.lat);
    const lon1 = toRad(pov.lng);
    const lat2 = toRad(lat);
    const lon2 = toRad(lon);
    
    // Calculate angular distance using spherical law of cosines
    const angularDistance = Math.acos(
      Math.sin(lat1) * Math.sin(lat2) + 
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
    );
    
    // Point is visible if angular distance is less than 90 degrees (π/2 radians)
    // Adding small buffer (85 degrees) to hide slightly before edge
    return angularDistance < (85 * Math.PI / 180);
  };
  
  // Update coaching tooltip position when globe moves (rotation/zoom)
  // This keeps the tooltip locked to the country's position on the globe
  // OPTIMIZED: Only update state when position changes significantly to avoid breaking bounce animation
  useEffect(() => {
    if (!coachingTip.visible) return;
    if (!globeEl.current) return;
    
    let animationFrameId;
    const POSITION_THRESHOLD = 2; // Only update if position changed by more than 2px
    
    const updateTooltipPosition = () => {
      const globeContainer = document.querySelector('.globe-container');
      if (!globeContainer) {
        animationFrameId = requestAnimationFrame(updateTooltipPosition);
        return;
      }
      
      const rect = globeContainer.getBoundingClientRect();
      
      // Check if point is on the visible hemisphere of the globe
      const isVisible = isPointOnVisibleHemisphere(coachingTip.lat, coachingTip.lon);
      
      const screenCoords = globeEl.current.getScreenCoords(coachingTip.lat, coachingTip.lon);
      
      if (screenCoords) {
        const newX = Math.min(Math.max(screenCoords.x, 80), rect.width - 80);
        const newY = Math.max(screenCoords.y - 60, 100);
        
        // Check if we need to update position or visibility
        const deltaX = Math.abs(newX - lastTooltipPosRef.current.x);
        const deltaY = Math.abs(newY - lastTooltipPosRef.current.y);
        const visibilityChanged = isVisible !== lastTooltipVisibilityRef.current;
        
        if (deltaX > POSITION_THRESHOLD || deltaY > POSITION_THRESHOLD || visibilityChanged) {
          lastTooltipPosRef.current = { x: newX, y: newY };
          lastTooltipVisibilityRef.current = isVisible;
          setCoachingTip(prev => ({
            ...prev,
            x: newX,
            y: newY,
            isOnVisibleSide: isVisible
          }));
        }
      }
      
      animationFrameId = requestAnimationFrame(updateTooltipPosition);
    };
    
    // Initialize last position and visibility refs
    lastTooltipPosRef.current = { x: coachingTip.x, y: coachingTip.y };
    lastTooltipVisibilityRef.current = true; // Assume visible when tooltip is first shown
    animationFrameId = requestAnimationFrame(updateTooltipPosition);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [coachingTip.visible, coachingTip.lat, coachingTip.lon, coachingTip.x, coachingTip.y]);

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

  /* Get tooltip color - shifted one step on heatmap scale for better visibility
   * isWarmer=true: one step MORE intense (redder) 
   * isWarmer=false: one step LESS intense (lighter/cooler)
   */
  function getTooltipColor(distance, isWarmer = true) {
    if (isWarmer) {
      // One step more intense (warmer/redder)
      if (distance > 12000) return '#fee8cc';  // was #fef2dc
      if (distance > 9000) return '#fedebc';   // was #fee8cc
      if (distance > 6500) return '#fec89e';   // was #fedebc
      if (distance > 5000) return '#febf8f';   // was #fec89e
      if (distance > 4000) return '#fea671';   // was #febf8f
      if (distance > 3000) return '#fe9a62';   // was #fea671
      if (distance > 2500) return '#fe8444';   // was #fe9a62
      if (distance > 2000) return '#fe7835';   // was #fe8444
      if (distance > 1500) return '#fe6e26';   // was #fe7835
      if (distance > 1200) return '#fe5e1a';   // was #fe6e26
      if (distance > 900) return '#ea520f';    // was #fe5e1a
      if (distance > 600) return '#d44505';    // was #ea520f
      if (distance > 300) return '#b83700';    // was #d44505
      return '#9a2e00';                        // even darker red for very close
    } else {
      // One step less intense (cooler/lighter)
      if (distance > 12000) return '#fff9f0';  // even lighter than #fef2dc
      if (distance > 9000) return '#fef2dc';   // was #fee8cc
      if (distance > 6500) return '#fee8cc';   // was #fedebc
      if (distance > 5000) return '#fedebc';   // was #fec89e
      if (distance > 4000) return '#fec89e';   // was #febf8f
      if (distance > 3000) return '#febf8f';   // was #fea671
      if (distance > 2500) return '#fea671';   // was #fe9a62
      if (distance > 2000) return '#fe9a62';   // was #fe8444
      if (distance > 1500) return '#fe8444';   // was #fe7835
      if (distance > 1200) return '#fe7835';   // was #fe6e26
      if (distance > 900) return '#fe6e26';    // was #fe5e1a
      if (distance > 600) return '#fe5e1a';    // was #ea520f
      if (distance > 300) return '#ea520f';    // was #d44505
      return '#d44505';                        // was #b83700
    }
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
        // Error is logged - first-run screen will show loading state
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

  // First-run experience: Show CTA when app is ready, handle start
  useEffect(() => {
    if (countriesData.length > 0 && Object.keys(allStations).length > 0 && !firstRunComplete) {
      const firstRun = document.getElementById('first-run');
      const status = document.getElementById('first-run-status');
      const cta = document.getElementById('first-run-cta');
      const eq = document.getElementById('first-run-eq');
      
      if (firstRun && status && cta) {
        // Update status and show CTA, hide equalizer
        status.textContent = 'Ready to play';
        if (eq) eq.classList.add('eq-hidden');
        cta.style.display = 'flex';
        firstRun.classList.add('ready');
        
        // Add visible class after a brief delay for animation
        setTimeout(() => {
          cta.classList.add('visible');
        }, 100);
        
        // Handle CTA click - starts game directly, skipping the modal
        const handleStart = () => {
          firstRun.classList.add('hidden');
          setFirstRunComplete(true);
          
          // Stop auto-rotate and re-enable user controls
          if (globeEl.current) {
            const controls = globeEl.current.controls();
            if (controls) {
              controls.autoRotate = false;
              controls.enableRotate = true;
              controls.enableZoom = true;
              controls.enablePan = true;
            }
          }
          
          // Call onGameStart via ref after overlay fades
          setTimeout(() => {
            firstRun.style.display = 'none';
            if (onGameStartRef.current) {
              onGameStartRef.current();
            }
          }, 600);
        };
        
        cta.addEventListener('click', handleStart);
        
        // Also handle Enter key and click anywhere on ready state
        const handleKeyOrClick = (e) => {
          if (e.key === 'Enter' || (e.type === 'click' && e.target !== cta)) {
            handleStart();
          }
        };
        
        firstRun.addEventListener('click', handleKeyOrClick);
        document.addEventListener('keydown', handleKeyOrClick);
        
        return () => {
          cta.removeEventListener('click', handleStart);
          firstRun.removeEventListener('click', handleKeyOrClick);
          document.removeEventListener('keydown', handleKeyOrClick);
        };
      }
    }
  }, [countriesData, allStations, firstRunComplete]);

  /* Compute Centroid of a Country */
  const computeCentroid = (feature) => {
    /* Using d3-geo for accurate centroid calculation */
    const [lon, lat] = geoCentroid(feature);
    return { lat, lon };
  };

  /**
   * Animate guessed country colors to a target color using discrete keyframe steps.
   * Uses 12 steps over 400ms for smooth animation without Globe re-render choppiness.
   * @param {Array} guessesSnapshot - Snapshot of current guesses
   * @param {string} targetColor - Final color to animate to (e.g., '#58CC02')
   * @param {Function} onComplete - Callback when animation completes
   */
  const animateColorsToTarget = useCallback((guessesSnapshot, targetColor, onComplete) => {
    // Cancel any pending animation timers from a previous animation
    colorAnimationTimers.current.forEach(id => clearTimeout(id));
    colorAnimationTimers.current = [];
    
    if (!guessesSnapshot || guessesSnapshot.length === 0) {
      onComplete?.();
      return;
    }
    
    // Color helpers (local to avoid stale closure / exhaustive-deps issues)
    const hexToRgbLocal = (hex) => {
      if (!hex) return null;
      const hexStr = String(hex);
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hexStr);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    };
    const rgbToHexLocal = (r, g, b) => {
      return '#' + [r, g, b].map(x => {
        const h = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return h.length === 1 ? '0' + h : h;
      }).join('');
    };
    const interpolate = (color1, color2, factor) => {
      const c1 = hexToRgbLocal(color1);
      const c2 = hexToRgbLocal(color2);
      if (!c1 || !c2) return color2 || '#58CC02';
      return rgbToHexLocal(
        c1.r + (c2.r - c1.r) * factor,
        c1.g + (c2.g - c1.g) * factor,
        c1.b + (c2.b - c1.b) * factor
      );
    };
    
    const originalColors = guessesSnapshot.map(g => g.color || '#58CC02');
    const totalDuration = 400; // Total animation duration in ms
    const steps = 12; // Number of discrete color steps (~30fps)
    const stepDuration = totalDuration / steps;
    
    // Create keyframes at 20%, 40%, 60%, 80%, 100% progress
    for (let i = 1; i <= steps; i++) {
      const progress = i / steps;
      const delay = i * stepDuration;
      
      const timerId = setTimeout(() => {
        // Ease-out: 1 - (1 - progress)^3
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        const animatedGuesses = guessesSnapshot.map((g, idx) => ({
          ...g,
          color: interpolate(originalColors[idx], targetColor, easedProgress)
        }));
        
        setGuesses(animatedGuesses);
        
        // Call onComplete after the final step
        if (i === steps) {
          const completeId = setTimeout(() => onComplete?.(), 50);
          colorAnimationTimers.current.push(completeId);
        }
      }, delay);
      colorAnimationTimers.current.push(timerId);
    }
  }, []);

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
    
    // Reset states including correctGuess
    setCorrectGuess(false);
    setAudioPlaying(false);
    setAudioError(false);
    setRoundFailed(false);
    setRevealPulse(false);
    setDamageKey(0);
    clearTimeout(audioErrorTimerRef.current);
    clearTimeout(stallTimerRef.current);

    // COUNTRY-FIRST SELECTION: Pick a random country, then a random station from it.
    // This gives every country equal probability (1/N) instead of the old
    // language-first approach which massively overrepresented single-language countries.

    // 1. Get all available countries (keys of allStations), excluding already-used ones
    const allCountryNames = Object.keys(allStations).filter(c => allStations[c].length > 0);
    
    let availableCountries = allCountryNames.filter(
      c => !usedCountries.includes(c.toLowerCase())
    );

    // If all countries used (shouldn't happen in 5 rounds, but safety net), reset
    if (availableCountries.length === 0) {
      availableCountries = allCountryNames;
      setUsedCountries([]);
      console.log('DEBUG - All countries used, resetting country pool');
    }

    console.log('DEBUG - Available countries:', availableCountries.length, '/', allCountryNames.length);

    if (availableCountries.length === 0) {
      console.error('No available countries');
      return;
    }

    // 2. Pick a random country with equal probability
    const randomCountry = availableCountries[Math.floor(Math.random() * availableCountries.length)];

    // 3. Find target country in globe/map data
    const target = countriesData.find(
      feature => {
        const featureName = feature.properties?.name || "";
        return featureName.toLowerCase() === randomCountry.toLowerCase();
      }
    );

    if (!target) {
      console.error('Could not find target country in map data:', randomCountry);
      // Mark this country as used (bad data) and try another
      setUsedCountries(prev => [...prev, randomCountry.toLowerCase()]);
      startNewRound();
      return;
    }

    // 4. Get all stations for this country and pick one randomly
    const countryStations = allStations[randomCountry];
    if (!countryStations || !countryStations.length) {
      console.error('No stations found for country:', randomCountry);
      setUsedCountries(prev => [...prev, randomCountry.toLowerCase()]);
      startNewRound();
      return;
    }

    const station = countryStations[Math.floor(Math.random() * countryStations.length)];
    const stationUrl = station.url_resolved || station.url;
    setRadioStation({ ...station, url_resolved: stationUrl });

    setTargetCountry(target);
    console.log('DEBUG - Target Country:', {
      name: target.properties?.name,
      station: station.name,
      stationCountry: randomCountry,
      stationURL: stationUrl,
      language: station.language
    });

    // ...rest of existing startNewRound code...

    setAttempts(0);
    // setGuesses([]); // Remove this so guesses remain for display in the round summary
     // Removed "Ready for next round" message
    
    // Reset coaching state for new round (but keep tooltip count across rounds)
    setLastGuessDistance(null);
    setWasGettingWarmer(false);
    setCoachingTip(prev => ({ ...prev, visible: false }));
    
    // Audio setup using helper function
    console.log("DEBUG: Setting up audio source", stationUrl);
    setupAudioSource(stationUrl);
  }, [countriesData, allStations, usedCountries, setupAudioSource]);

  // Remove or comment out the duplicated effect:
  /*
  // useEffect(() => {
  //   if (countriesData.length > 0 && gameStarted) {
  //     startNewRound();
  //   }
  // }, [countriesData, gameStarted, startNewRound]);
  */

  /* Handle Guess - updated with logging and modal check */
  const onPolygonClick = (feature, event, coords) => {
    // Block interaction during splash screen
    if (!firstRunComplete) return;
    // NEW: Do nothing if a correct guess has been made or round failed (out of points)
    if (correctGuess || roundFailed) return;
    
    if (showResultBar || gameOver) return;
    if (!targetCountry) return;
    
    const polygonId = feature.properties?.iso_a2 || feature.properties?.name || feature.id;
    // If already guessed, ignore
    if (guesses.some((g) => g.id === polygonId)) return;
    
    // Use the clicked geographic coordinates for tooltip positioning
    // This avoids centroid issues with countries that have overseas territories (e.g., France)
    const clickedGeoCoords = coords ? { lat: coords.lat, lng: coords.lng } : null;
    
    if (isMobile) {
      // Mobile: Set as selected country with click coords
      setSelectedCountry({ ...feature, polygonId, clickedGeoCoords });
      // Haptic feedback (Android — gracefully ignored on iOS)
      navigator.vibrate?.(10);
      // Ripple ring at tap point — auto-clears after propagation
      if (clickedGeoCoords) {
        setSelectionRing({ lat: clickedGeoCoords.lat, lng: clickedGeoCoords.lng, t: Date.now() });
        setTimeout(() => setSelectionRing(null), 1200); // clear after ring finishes
      }
    } else {
      // Desktop: Make guess immediately with click coords
      handleConfirmGuess({ ...feature, polygonId, clickedGeoCoords });
    }
  };

  // Move guess logic to confirmation handler
  const handleConfirmGuess = (feature = selectedCountry) => {
    if (!feature) return;
    
    // Hide any existing coaching tooltip before processing new guess
    setCoachingTip(prev => ({ ...prev, visible: false }));
    
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
    
    // Coaching tooltip system: Shows up to 3 tooltips to teach the hot/cold mechanic
    // - First tooltip: Initial distance-based feedback
    // - Second tooltip: "Getting warmer!" or "Getting colder!" based on comparison
    // - Third tooltip: Only if they start getting colder after getting warmer
    const showCoachingTooltip = (text, type, heatmapColor = null) => {
      const globeContainer = document.querySelector('.globe-container');
      if (globeContainer && globeEl.current) {
        const rect = globeContainer.getBoundingClientRect();
        
        // Use clicked geographic coordinates if available (avoids centroid issues with overseas territories)
        // Convert geo coords to screen coords using globe's utility method
        let tooltipX, tooltipY;
        let tooltipLat, tooltipLon;
        
        if (feature.clickedGeoCoords) {
          // Use the actual clicked location on the globe
          tooltipLat = feature.clickedGeoCoords.lat;
          tooltipLon = feature.clickedGeoCoords.lng;
          const screenCoords = globeEl.current.getScreenCoords(tooltipLat, tooltipLon);
          if (screenCoords) {
            tooltipX = screenCoords.x;
            tooltipY = screenCoords.y - 60; // Offset above click point
          } else {
            tooltipX = rect.width / 2;
            tooltipY = rect.height / 2 - 50;
          }
        } else {
          // Fallback to centroid-based positioning
          tooltipLat = guessCentroid.lat;
          tooltipLon = guessCentroid.lon;
          const screenCoords = globeEl.current.getScreenCoords(tooltipLat, tooltipLon);
          if (screenCoords) {
            tooltipX = screenCoords.x;
            tooltipY = screenCoords.y - 60;
          } else {
            tooltipX = rect.width / 2;
            tooltipY = rect.height / 2 - 50;
          }
        }
        
        // Clamp to stay within container bounds
        tooltipX = Math.min(Math.max(tooltipX, 80), rect.width - 80);
        tooltipY = Math.max(tooltipY, 100);
        
        setCoachingTip(prev => ({
          visible: true,
          text,
          type,
          x: tooltipX,
          y: tooltipY,
          lat: tooltipLat,
          lon: tooltipLon,
          heatmapColor,  // Pass exact color from getColor()
          isOnVisibleSide: true,  // Country is visible when user clicks it
          id: prev.id + 1  // Increment ID to trigger animation
        }));
        
        setCoachingTooltipCount(prev => prev + 1);
        
        // Tooltip stays visible until next click (no auto-hide timer)
      }
    };
    
    // Only show coaching tooltips if we haven't shown 3 yet
    if (coachingTooltipCount < 3) {
      if (lastGuessDistance === null) {
        // First guess ever: Show initial distance-based feedback
        // Use warmer color (more intense) for first guess
        const tooltipColor = getTooltipColor(distance, true);
        let coachType = 'cold';
        let coachText = '';
        
        if (distance < 500) {
          coachType = 'hot';
          coachText = 'So close! 🔥';
        } else if (distance < 2000) {
          coachType = 'warm';
          coachText = 'Getting warm!';
        } else if (distance < 5000) {
          coachType = 'cool';
          coachText = 'A bit far — keep trying!';
        } else {
          coachType = 'cold';
          coachText = 'Cold — try another region ❄️';
        }
        
        showCoachingTooltip(coachText, coachType, tooltipColor);
      } else {
        // Compare with previous guess
        const isWarmer = distance < lastGuessDistance;
        // Tooltip color shifts in direction of feedback
        const tooltipColor = getTooltipColor(distance, isWarmer);
        
        if (isWarmer && !wasGettingWarmer) {
          // Started getting warmer - show feedback with more intense color
          showCoachingTooltip('Getting warmer! 🔥', 'warm', tooltipColor);
          setWasGettingWarmer(true);
        } else if (!isWarmer && wasGettingWarmer) {
          // Was getting warmer but now getting colder - show feedback with less intense color
          showCoachingTooltip('Getting colder! ❄️', 'cool', tooltipColor);
          setWasGettingWarmer(false);
        }
        // If continuing in same direction, no tooltip needed
      }
    }
    
    // Update last guess distance for next comparison
    setLastGuessDistance(distance);
    
    // No text feedback in scoreboard - colors are self-explanatory
    // This follows Rams #10 "As little design as possible"
  
    let updatedScore = score;
    
    // Compute new guess before updating round result
    const newGuess = { 
      id: feature.properties?.iso_a2 || feature.properties?.name || feature.id,
      name: guessedName, 
      distance, 
      color: getColor(distance), 
      countryCode: getCountryCode(feature),
      altitude: 0.096 // Start with elevated altitude for pop effect (8× base of 0.012)
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
      
      // Hide coaching tip if showing
      setCoachingTip(prev => ({ ...prev, visible: false }));
      
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      // Remove the setTimeout and add animation class
      document.querySelector('.audio-player').classList.add('flip-out');
      // Show the continue button with flip-in animation after audio player flips out
      // Existing correct guess handling...
      logEvent('game', 'correct_guess', `Round ${currentRound}: ${targetCountry.properties?.name}`);
      const targetName = targetCountry.properties?.name || targetCountry.id || 'Unknown';
      const baseScore = 5000;
      const roundScore = Math.max(baseScore - ((newAttempts - 1) * 573), 0);
      updatedScore += roundScore;
      // Store full round result including station details and guesses (including current guess)
      setRoundResults([
        ...roundResults, 
        { 
          round: currentRound, 
          attempts: newAttempts, 
          score: roundScore, 
          target: targetName,
          countryCode: getCountryCode(targetCountry),
          stationName: radioStation.name || 'Unknown Station',
          stationUrl: radioStation.homepage || radioStation.url,
          guesses: [...guesses, newGuess]
        }
      ]);
  
      const stationCountry = radioStation?.country;
      if (stationCountry && !usedCountries.includes(stationCountry.toLowerCase())) {
        console.log('DEBUG: Marking correct country used:', stationCountry);
        setUsedCountries((prev) => [...prev, stationCountry.toLowerCase()]);
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
        lockControls(2100);
        globeEl.current.pointOfView(cameraOffset, 2000);
      }
    } else {
      // WRONG GUESS: trigger damage animation
      setDamageKey(prev => prev + 1);

      // Play wrong-guess sound — scale with music volume so it's always heard
      const wrongSfx = wrongSelectSound.cloneNode();
      const musicVol = volume / 100;
      wrongSfx.volume = Math.min(1.0, 0.50 + musicVol * 0.5);
      wrongSfx.play().catch(() => {});

      // Globe tremor — damped rotational shake scaled by damage
      // Skip on final guess (round failure) so the zoom-to-reveal is smooth
      const projectedScore = Math.max(5000 - (newAttempts * 573), 0);
      if (globeEl.current && projectedScore > 0) {
        // Cancel any in-progress tremor
        tremorTimers.current.forEach(clearTimeout);
        tremorTimers.current = [];

        const pov = globeEl.current.pointOfView();
        const t = Math.min(newAttempts / 9, 1);  // 0–1 damage
        const amp = 1.5 + t * 2.5;               // 1.5° → 4°
        const zoomBump = 0.04 + t * 0.04;        // altitude bump

        // If user starts dragging, cancel the tremor immediately
        const cancelTremor = () => {
          tremorTimers.current.forEach(clearTimeout);
          tremorTimers.current = [];
          document.removeEventListener('mousedown', cancelTremor);
          document.removeEventListener('touchstart', cancelTremor);
        };
        document.addEventListener('mousedown', cancelTremor, { once: true });
        document.addEventListener('touchstart', cancelTremor, { once: true });
        // Auto-remove listeners after tremor finishes
        const cleanupTid = setTimeout(cancelTremor, 420);
        tremorTimers.current.push(cleanupTid);

        // Keyframes: jolt right → jolt left → settle back
        const steps = [
          { dlat:  amp * 0.4, dlng:  amp,     dalt: -zoomBump, dur: 0,   ms: 80  },
          { dlat: -amp * 0.3, dlng: -amp * 0.7, dalt:  zoomBump * 0.3, dur: 0, ms: 160 },
          { dlat:  amp * 0.15, dlng:  amp * 0.3, dalt: 0, dur: 0, ms: 240 },
          { dlat: 0,          dlng: 0,          dalt: 0, dur: 0, ms: 340 },
        ];

        steps.forEach(({ dlat, dlng, dalt, ms }) => {
          const tid = setTimeout(() => {
            if (!globeEl.current) return;
            globeEl.current.pointOfView({
              lat: pov.lat + dlat,
              lng: pov.lng + dlng,
              altitude: pov.altitude + dalt,
            }, 80);
          }, ms);
          tremorTimers.current.push(tid);
        });
      }
      
      // CHECK FOR ROUND FAILURE: if score would hit 0, auto-end the round
      if (projectedScore <= 0) {
        // Round failed — ran out of points
        setRoundFailed(true);
        
        // Record round result with 0 score
        const targetName = targetCountry.properties?.name || targetCountry.id || 'Unknown';
        setRoundResults(prev => [
          ...prev,
          {
            round: currentRound,
            attempts: newAttempts,
            score: 0,
            target: targetName,
            countryCode: getCountryCode(targetCountry),
            stationName: radioStation.name || 'Unknown Station',
            stationUrl: radioStation.homepage || radioStation.url,
            guesses: [...guesses, newGuess]
          }
        ]);
        
        // Mark country as used
        const stationCountry = radioStation?.country;
        if (stationCountry && !usedCountries.includes(stationCountry.toLowerCase())) {
          setUsedCountries(prev => [...prev, stationCountry.toLowerCase()]);
        }
        
        // Immediately stop radio and trigger end-of-round sequence
        if (audioRef.current) {
          audioRef.current.pause();
          setAudioPlaying(false);
        }
        
        // Play the round-lose sound
        const loseSfx = roundLoseSound.cloneNode();
        loseSfx.volume = 0.30;
        loseSfx.play().catch(() => {});
        
        // Hide coaching tip
        setCoachingTip(prev => ({ ...prev, visible: false }));
        
        // Block further clicks
        setCorrectGuess(true);
        
        // Flip out audio player and show result bar with 0
        document.querySelector('.audio-player')?.classList.add('flip-out');
        
        // Zoom to reveal the correct country
        const targetCentroid = computeCentroid(targetCountry);
        if (globeEl.current) {
          lockControls(2100);
          globeEl.current.pointOfView(
            { lat: targetCentroid.lat, lng: targetCentroid.lon - 1, altitude: 1.0 },
            2000
          );
        }
      }
    }
    
    setAttempts(newAttempts);
    setScore(updatedScore);
    // No longer setting feedback text - colors are self-explanatory
    
    // === BOUNCY SPRING ALTITUDE ANIMATION ===
    // Uses library's built-in polygonsTransitionDuration (250ms) for smooth tweening
    // Each setTimeout sets the NEXT target altitude - library interpolates smoothly between values
    
    // Altitude keyframes for damped spring oscillation (2 bounces before settling)
    // Base altitude is 0.012, guessed countries rest slightly higher to stand out
    const groundAltitude = 0.001;        // Starting flat
    const peakAltitude = 0.048;          // Overshoot ceiling (4× base) - dramatic "shoot up"
    const undershootAltitude = 0.010;    // Below rest - "floor bounce"
    const miniOvershootAltitude = 0.020; // Small bounce above rest (damping)
    const restAltitude = 0.018;          // Final resting position (1.5× base, above unclicked countries)
    
    const guessId = newGuess.id;
    const targetColor = newGuess.color;
    
    // Play selection sound on every guess — scale with music volume so it's always heard
    const selectSfx = countrySelectSound.cloneNode();
    const musicVol = volume / 100; // 0–1 from slider
    selectSfx.volume = Math.min(1.0, 0.30 + musicVol * 0.5);
    selectSfx.play().catch(() => {});

    // Step 1: Add polygon at ground level with final color (instant color, animated altitude)
    setGuesses(prevGuesses => [...prevGuesses, { ...newGuess, altitude: groundAltitude, color: targetColor }]);
    
    // Step 2: Shoot up to peak (tween starts at 20ms, arrives ~270ms)
    setTimeout(() => {
      setGuesses(prevGuesses => 
        prevGuesses.map(g => 
          g.id === guessId ? { ...g, altitude: peakAltitude } : g
        )
      );
    }, 20);
    
    // Step 3: Bounce down past rest to undershoot (tween starts at 250ms, arrives ~500ms)
    setTimeout(() => {
      setGuesses(prevGuesses => 
        prevGuesses.map(g => 
          g.id === guessId ? { ...g, altitude: undershootAltitude } : g
        )
      );
    }, 250);
    
    // Step 4: Bounce back up to mini-overshoot (tween starts at 480ms, arrives ~730ms)
    setTimeout(() => {
      setGuesses(prevGuesses => 
        prevGuesses.map(g => 
          g.id === guessId ? { ...g, altitude: miniOvershootAltitude } : g
        )
      );
    }, 480);
    
    // Step 5: Settle to final rest position (tween starts at 700ms, arrives ~950ms)
    setTimeout(() => {
      setGuesses(prevGuesses => 
        prevGuesses.map(g => 
          g.id === guessId ? { ...g, altitude: restAltitude } : g
        )
      );
    }, 700);

    // Clear selection after guess
    setSelectedCountry(null);
  };

  /* Handler to move to the next round */
  const handleNextRound = useCallback(() => {
    setContinueFading(false);
    if (currentRound < 5) {
      // Reset the animation classes
      const audioPlayer = document.querySelector('.audio-player');
      const continueButton = document.querySelector('.continue-button');
      
      audioPlayer.classList.remove('flip-out');
      continueButton.classList.remove('flip-in');
      
      // Force a reflow to reset animations
      void audioPlayer.offsetWidth;
      
      // Cinematic globe spin animation to random position
      spinTransition();
      
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
      
      // Animate heatmap colors to green using discrete keyframe steps
      // This avoids per-frame state updates that cause choppy Globe re-renders
      const guessesSnapshot = [...guesses];
      
      const proceedToNextRound = () => {
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
            // Start stall timer — if audio doesn't play within 4s, show error button
            clearTimeout(stallTimerRef.current);
            stallTimerRef.current = setTimeout(() => setAudioError(true), 4000);
            audioRef.current.play()
              .then(() => {
                setAudioPlaying(true);
                clearTimeout(stallTimerRef.current);
              })
              .catch(e => {
                if (!(e.message && e.message.includes("aborted"))) {
                  console.error("Audio playback error:", e);
                }
              });
          }
        }, 100);
      };
      
      if (guesses.length > 0) {
        animateColorsToTarget(guessesSnapshot, '#58CC02', proceedToNextRound);
      } else {
        // No guesses to animate, just proceed
        setTimeout(proceedToNextRound, 250);
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
  }, [currentRound, guesses, score, radioStation, spinTransition, startNewRound, animateColorsToTarget]);

  // Handler for result bar continue button - simplified flow
  const handleResultBarContinue = useCallback(() => {
    // Stop current audio
    if (audioRef.current) {
      audioRef.current.pause();
      setAudioPlaying(false);
    }
    
    // Animate heatmap colors to green
    const guessesSnapshot = [...guesses];
    
    const proceedAfterAnimation = () => {
      // Reset state for next round
      setCorrectGuess(false);
      
      if (currentRound < 5) {
        // Cinematic globe spin animation to random position (only between rounds)
        spinTransition();

        // Next round
        logEvent('game', 'next_round', `Round ${currentRound + 1} started`);
        setCurrentRound(prev => prev + 1);
        setAttempts(0);
        // Cancel any pending color animation before clearing guesses
        colorAnimationTimers.current.forEach(id => clearTimeout(id));
        colorAnimationTimers.current = [];
        setGuesses([]);
        setPreloadedFlagUrl(null);
        
        startNewRound();
        
        // Flip in audio player after result bar is gone
        setTimeout(() => {
          const audioPlayer = document.querySelector('.audio-player');
          audioPlayer?.classList.remove('flip-out');
          audioPlayer?.classList.add('flip-in-reset');
          setTimeout(() => {
            audioPlayer?.classList.remove('flip-in-reset');
          }, 500);
        }, 50);
        
        // Start playing audio after setup
        setTimeout(() => {
          if (audioRef.current && radioStation) {
            // Start stall timer — if audio doesn't play within 4s, show error button
            clearTimeout(stallTimerRef.current);
            stallTimerRef.current = setTimeout(() => setAudioError(true), 4000);
            audioRef.current.play()
              .then(() => {
                setAudioPlaying(true);
                clearTimeout(stallTimerRef.current);
              })
              .catch(e => {
                if (!(e.message && e.message.includes("aborted"))) {
                  console.error("Audio playback error:", e);
                }
              });
          }
        }, 100);
      } else {
        // Game over - go to results
        logEvent('game', 'game_over', `Final score: ${score}`);
        setTimeout(() => {
          setGameOver(true);
        }, 300);
      }
    };
    
    // Start everything simultaneously — spin, color fade, and result bar close
    const closeAndProceed = () => {
      const resultBar = document.querySelector('.result-bar');
      resultBar?.classList.add('closing');
      setTimeout(() => {
        setShowResultBar(false);
        proceedAfterAnimation();
      }, 300);
    };

    if (currentRound < 5) {
      // Fire spin, color fade, and bar close all at once
      if (guessesSnapshot.length > 0) {
        animateColorsToTarget(guessesSnapshot, '#58CC02', () => {});
      }
      closeAndProceed();
    } else {
      closeAndProceed();
    }
  }, [guesses, currentRound, score, spinTransition, startNewRound, radioStation, animateColorsToTarget]); // handleResultBarContinue

  // Add cleanup effect using helper function
  useEffect(() => {
    return () => {
      cleanupAudio();
      clearTimeout(audioErrorTimerRef.current);
      clearTimeout(stallTimerRef.current);
    };
  }, [cleanupAudio]);

  /* Handler to restart the entire game */
  const playAgain = useCallback(() => {
    // Reset globe to default position
    resetToDefault();

    // Trigger closing animation
    setModalClosing(true);
    
    // Animate heatmap colors to green using discrete keyframe steps
    // This avoids per-frame state updates that cause choppy Globe re-renders
    const guessesSnapshot = [...guesses];
    
    const resetGame = () => {
      logEvent('game', 'replay', 'Game replayed');
      setCurrentRound(1);
      setRoundResults([]);
      setGameOver(false);
      setModalClosing(false);
      
      setAttempts(0);
      setScore(0);
      // Cancel any pending color animation before clearing guesses
      colorAnimationTimers.current.forEach(id => clearTimeout(id));
      colorAnimationTimers.current = [];
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
    };
    
    if (guesses.length > 0) {
      animateColorsToTarget(guessesSnapshot, '#58CC02', resetGame);
    } else {
      // No guesses to animate, just proceed
      setTimeout(resetGame, 250);
    }
  }, [guesses, resetToDefault, startNewRound, animateColorsToTarget]);

  // Lightweight auto-recovery: silently swap to a new station (no visual reset)
  // Used by handleAudioError when the stream fails and we retry automatically
  const autoRecoverStation = useCallback(() => {
    clearTimeout(audioErrorTimerRef.current);
    clearTimeout(stallTimerRef.current);
    setAudioError(false);
    startNewRound();
  }, [startNewRound]);

  // Full cinematic round reset: triggered by the user clicking "Try another station"
  // Clears all guesses, resets attempts, spins the globe, flips the audio player,
  // and starts a completely fresh round as if nothing happened
  const callStationBroken = useCallback(() => {
    clearTimeout(audioErrorTimerRef.current);
    clearTimeout(stallTimerRef.current);
    setAudioError(false);

    // Stop current audio immediately
    if (audioRef.current) {
      audioRef.current.pause();
      setAudioPlaying(false);
    }

    // Snapshot current guesses for color animation, then clear everything
    const guessesSnapshot = [...guesses];

    const freshStart = () => {
      // Reset all round state
      setAttempts(0);
      colorAnimationTimers.current.forEach(id => clearTimeout(id));
      colorAnimationTimers.current = [];
      setGuesses([]);
      setCorrectGuess(false);
      setSelectedCountry(null);
      setSelectionRing(null);
      setShowResultBar(false);
      setPreloadedFlagUrl(null);

      // Cinematic globe spin to a new position
      spinTransition();

      // Pick a brand new country + station
      startNewRound();

      // Flip in the audio player
      setTimeout(() => {
        const audioPlayer = document.querySelector('.audio-player');
        audioPlayer?.classList.remove('flip-out');
        audioPlayer?.classList.add('flip-in-reset');
        setTimeout(() => {
          audioPlayer?.classList.remove('flip-in-reset');
        }, 500);
      }, 50);

      // Auto-play the new station with stall detection
      setTimeout(() => {
        if (audioRef.current) {
          clearTimeout(stallTimerRef.current);
          stallTimerRef.current = setTimeout(() => setAudioError(true), 4000);
          audioRef.current.play()
            .then(() => {
              setAudioPlaying(true);
              clearTimeout(stallTimerRef.current);
            })
            .catch(e => {
              if (!(e.message && e.message.includes('aborted'))) {
                console.error('Audio playback error after station reset:', e);
              }
            });
        }
      }, 100);
    };

    // Animate existing guess colors to green before clearing, or just proceed
    if (guessesSnapshot.length > 0) {
      animateColorsToTarget(guessesSnapshot, '#58CC02', freshStart);
    } else {
      freshStart();
    }
  }, [guesses, spinTransition, startNewRound, animateColorsToTarget]);

  // Wrap handleAudioError in useCallback
  const handleAudioError = useCallback((error) => {
    setIsLoading(true); // Keep loading state during error
    // Delay showing "Try another station" by 3s — gives auto-recovery time to fix it
    clearTimeout(audioErrorTimerRef.current);
    audioErrorTimerRef.current = setTimeout(() => setAudioError(true), 3000);
    if (error?.code === 1) {
      
      // ...any additional logic...
    }
    if (!error) return; // Guard against null errors
    console.error("Audio Error:", error);
    
    // Handle all media error codes — silently auto-recover (no visual reset)
    if (error.code === 1) { // MEDIA_ERR_ABORTED
      console.log("Media playback aborted, trying new station...");
      autoRecoverStation();
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
      autoRecoverStation();
    }
  }, [autoRecoverStation]);

  // Update the useEffect to include handleAudioError in dependencies
  useEffect(() => {
    const audioElement = audioRef.current;
    if (!audioElement) return;
    
    // Store the error handler reference for proper cleanup
    const errorHandler = (e) => handleAudioError(e.target.error);
    audioElement.addEventListener('error', errorHandler);
    
    return () => {
      audioElement.removeEventListener('error', errorHandler);
      cleanupAudio();
    };
  }, [handleAudioError, cleanupAudio]);

  /* Globe Material — vivid ocean blue */
  const globeMaterial = useMemo(() => {
    return new THREE.MeshPhongMaterial({
      color: '#039BE5',
      emissive: new THREE.Color(0x0066aa),
      emissiveIntensity: 0.45,
      shininess: 15,
      specular: new THREE.Color('#2a5a7a'),
    });
  }, []);

  // Updated toggleAudio function
  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
      setUserPausedAudio(true);  // User intentionally paused
    } else {
      // Only show loading spinner if audio needs to buffer
      // Check if audio has enough data to play (readyState >= 3 means HAVE_FUTURE_DATA)
      const needsBuffering = audioRef.current.readyState < 3;
      if (needsBuffering) {
        setIsLoading(true);
      }
      setUserPausedAudio(false);  // User is playing, clear the paused flag
      // Start stall timer — if audio doesn't play within 4s, show error button
      clearTimeout(stallTimerRef.current);
      stallTimerRef.current = setTimeout(() => setAudioError(true), 4000);
      audioRef.current
        .play()
        .then(() => {
          setIsLoading(false);
          setAudioPlaying(true);
          clearTimeout(stallTimerRef.current);
        })
        .catch((e) => {
          if (!(e.message && e.message.includes("aborted"))) {
            console.error("Audio playback error in toggleAudio:", e);
            autoRecoverStation();
          }
          setIsLoading(false);
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
  const onGameStart = useCallback(() => {
    logEvent('game', 'start', 'New game started');
    setGameStarted(true);
    setCurrentRound(1);
    setScore(0);
    setUsedCountries([]);
    startNewRound(); // Starts new round after user gesture
  }, [startNewRound]);

  // Keep ref updated for first-run experience
  useEffect(() => {
    onGameStartRef.current = onGameStart;
  }, [onGameStart]);

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

  // Old handleContinue removed - replaced by handleResultBarContinue

  // Add success sound effect with lower volume
  const successSound = useMemo(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}audio/success.mp3`);
    audio.volume = 0.05; // Set volume to 5%
    return audio;
  }, []);

  // Country selection "pop" sound — plays on every guess (correct or wrong)
  const countrySelectSound = useMemo(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}audio/countryselect.mp3`);
    return audio;
  }, []);

  // Tally tick sound — played as individual ticks during score count-up
  const tallySound = useMemo(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}audio/tally.mp3`);
    return audio;
  }, []);

  // Round-lose buzzer — played when the player runs out of points
  const roundLoseSound = useMemo(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}audio/roundlose.mp3`);
    audio.volume = 0.10; // Match success sound volume
    return audio;
  }, []);

  // Wrong guess sound — played on each incorrect country selection
  const wrongSelectSound = useMemo(() => {
    const audio = new Audio(`${import.meta.env.BASE_URL}audio/wrongselect.mp3`);
    audio.volume = 0.30;
    return audio;
  }, []);

  // Setup DEBUG object with country and station data
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
        
        // Setup and play audio
        const audioElement = audioRef.current;
        if (audioElement) {
          // Pause current playback before switching to new station
          // Note: setupAudioSource handles HLS cleanup internally
          audioElement.pause();
          setupAudioSource(stationUrl);
          audioElement.play().catch(console.error);
          setAudioPlaying(true);
        }
      };
    }
  }, [countriesData, allStations, setupAudioSource]);

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

  // Clear loading spinner, stall timer, and error state when audio is playing
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const handlePlaying = () => {
      setIsLoading(false);
      setAudioError(false);
      clearTimeout(stallTimerRef.current);
      clearTimeout(audioErrorTimerRef.current);
    }
    audio.addEventListener('playing', handlePlaying);
    return () => {
      audio.removeEventListener('playing', handlePlaying);
    };
  }, [audioRef]);

  // Web Audio API: Set up analyser and draw waveform
  useEffect(() => {
    if (!audioPlaying || !canvasRef.current || !audioRef.current) {
      // Cancel animation when not playing
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // Create audio context if needed
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }

    const audioContext = audioContextRef.current;

    // Resume context if suspended (browser autoplay policy)
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    // Create analyser if needed
    if (!analyserRef.current) {
      analyserRef.current = audioContext.createAnalyser();
      analyserRef.current.fftSize = 64; // Small for performance, gives 32 frequency bins
      analyserRef.current.smoothingTimeConstant = 0.8;
    }

    // Connect source to analyser (only once per audio element)
    if (!sourceRef.current) {
      try {
        sourceRef.current = audioContext.createMediaElementSource(audioRef.current);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContext.destination);
        setAnalyserReady(true);
      } catch {
        // Source already connected - this can happen on hot reload
        console.log('Audio source already connected');
        setAnalyserReady(true);
      }
    }

    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    let waveformCorsBlocked = false;
    let waveformCheckFrames = 0;

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);

      analyser.getByteFrequencyData(dataArray);

      // Detect CORS block on the waveform side too
      if (!waveformCorsBlocked && audioRef.current && !audioRef.current.paused) {
        let allZero = true;
        for (let i = 0; i < bufferLength; i++) {
          if (dataArray[i] > 0) { allZero = false; break; }
        }
        if (allZero) {
          waveformCheckFrames++;
          if (waveformCheckFrames > 60) waveformCorsBlocked = true;
        } else {
          waveformCheckFrames = 0;
        }
      }

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Fixed 5 bars, always rendered - sample from lower frequencies where most audio content lives
      const barCount = 5;
      const barWidth = 5;
      const barSpacing = 3;
      const totalWidth = barCount * barWidth + (barCount - 1) * barSpacing;
      const startX = (canvas.width - totalWidth) / 2; // Center the bars

      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';

      // Focus on lower frequency bins (0-12) where most music/voice content is
      const usableBins = Math.min(12, bufferLength);

      for (let i = 0; i < barCount; i++) {
        let value;
        if (waveformCorsBlocked && audioRef.current && !audioRef.current.paused) {
          // Synthetic waveform: different sine combos per bar for natural movement
          const t = performance.now() * 0.001;
          const barFreqs = [2.1, 3.3, 1.7, 4.5, 2.8];
          const barPhases = [0, 1.2, 0.7, 2.1, 1.5];
          value = 80 + 100 * Math.sin(t * barFreqs[i] + barPhases[i]) 
                     + 50 * Math.sin(t * barFreqs[i] * 2.3 + barPhases[i] + 1.0);
          value = Math.max(30, Math.min(255, value));
        } else {
          // Sample from the lower frequency range
          const dataIndex = Math.floor((i / barCount) * usableBins);
          value = dataArray[dataIndex];
        }
        
        // Smooth minimum height - bars shrink to tiny dot, never disappear
        const barHeight = Math.max(2, (value / 255) * canvas.height);
        
        const x = startX + i * (barWidth + barSpacing);
        const y = (canvas.height - barHeight) / 2; // Center vertically

        // Draw rounded bar
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioPlaying]);

  // ACCESSIBILITY: Keyboard handlers for modal dismissal and result bar continue
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Space, Enter or Escape in result bar continues to next round
      if (showResultBar && (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape')) {
        e.preventDefault();
        handleResultBarContinue();
        return;
      }
      
      if (e.key === 'Escape') {
        if (showRoundModal) {
          handleNextRound();
        } else if (gameOver) {
          playAgain();
        }
        // Note: Start modal should NOT close on escape (game hasn't started)
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showResultBar, showRoundModal, gameOver, handleResultBarContinue, handleNextRound, playAgain]);

  // NEW: Show result bar on correct guess OR round failure (0 points)
  useEffect(() => {
    if (correctGuess) {
      // 1. Start audio player exit animation
      document.querySelector('.audio-player')?.classList.add('flip-out');
      
      // 2. After audio player exits (500ms), show result bar
      const resultBarTimer = setTimeout(() => {
        setShowResultBar(true);
      }, 550);
      
      // 3. Confetti only on actual correct guess, not on round failure
      let confettiTimer;
      if (!roundFailed) {
        confettiTimer = setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }, 650);
      }
      
      return () => {
        clearTimeout(resultBarTimer);
        if (confettiTimer) clearTimeout(confettiTimer);
      };
    }
  }, [correctGuess, roundFailed]);

  // Pulse the revealed country on round failure — toggles altitude every 600ms
  useEffect(() => {
    if (!roundFailed) return;
    const interval = setInterval(() => {
      setRevealPulse(prev => !prev);
    }, 600);
    return () => clearInterval(interval);
  }, [roundFailed]);

  // Animate round score and attempts from 0 to final when result bar appears
  useEffect(() => {
    if (showResultBar && roundResults.length > 0) {
      const roundScore = roundResults[currentRound - 1]?.score || 0;
      const finalAttempts = roundResults[currentRound - 1]?.attempts || attempts || 1;
      const duration = 1500;
      const startTime = performance.now();
      const tickVolume = Math.min(1.0, 0.25 + (volume / 100) * 0.4);

      // Track state for tick-synced tally sound
      let lastDisplayedScore = 0;
      let lastTickTime = 0;
      const MIN_TICK_GAP = 50; // ms — prevent machine-gun ticking
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out curve for satisfying deceleration
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const displayedScore = Math.floor(easeOut * roundScore);
        setAnimatedRoundScore(displayedScore);
        setAnimatedAttempts(Math.max(1, Math.ceil(easeOut * finalAttempts)));

        // Play a tick when the displayed score changes (and enough time has passed)
        if (roundScore > 0 && displayedScore > lastDisplayedScore && (currentTime - lastTickTime) > MIN_TICK_GAP) {
          const tick = tallySound.cloneNode();
          tick.volume = tickVolume;
          tick.play().catch(() => {});
          lastTickTime = currentTime;
          lastDisplayedScore = displayedScore;
        }
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    } else {
      setAnimatedRoundScore(0);
      setAnimatedAttempts(0);
    }
  }, [showResultBar, roundResults, currentRound, attempts, tallySound, volume]);

  // NEW: Automatically load station when radioStation changes
  useEffect(() => {
    if (radioStation && audioRef.current) {
      // Use resolved URL if available, fallback to radioStation.url
      const stationUrl = radioStation.url_resolved || radioStation.url;
      // Get proxied URL for CORS-safe streaming
      const proxiedUrl = getProxiedUrl(stationUrl);
      audioRef.current.src = proxiedUrl;
      audioRef.current.load(); // Trigger buffering/loading
      console.log(`Loading station: ${radioStation.name}`);
    }
  }, [radioStation, getProxiedUrl]);

  // Play reveal sound when result bar appears
  useEffect(() => {
    if (showResultBar) {
      // Play reveal sound
      if (window.gameSounds?.reveal) {
        window.gameSounds.reveal.play().catch(() => {});
      }
    }
  }, [showResultBar]);

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
      {/* Damage vignette — red constriction from screen edges on wrong guesses */}
      <div
        className={`damage-vignette${attempts >= 7 ? ' damage-vignette--critical' : ''}`}
        style={{ '--damage-level': Math.min(attempts / 9, 1) }}
        key={`vignette-${damageKey}`}
      />
      {showResultBar && (
        <div className="result-bar">
          <div className="result-bar__content">
            <div className="result-bar__wrapper">
              {/* Left: Attempts indicator */}
              <div className={`result-bar__left ${roundFailed ? 'result-bar__left--failed' : ''}`}>
                {(() => {
                  if (roundFailed) {
                    return (
                      <>
                        <div className="result-bar__attempts-wrapper">
                          <span className="result-bar__attempts result-bar__attempts--failed">✕</span>
                        </div>
                        <p className="result-bar__label">ROUND OVER</p>
                      </>
                    );
                  }
                  // Use animated attempts value for count-up effect
                  const displayAttempts = animatedAttempts || 1;
                  // Get final attempts for the label (don't animate the label text)
                  const finalAttempts = roundResults[roundResults.length - 1]?.attempts || attempts || 1;
                  return (
                    <>
                      <div className="result-bar__attempts-wrapper">
                        <span className="result-bar__attempts">
                          {displayAttempts}
                        </span>
                        <span className="result-bar__attempts-suffix">
                          {displayAttempts === 1 ? 'st' : displayAttempts === 2 ? 'nd' : displayAttempts === 3 ? 'rd' : 'th'}
                        </span>
                      </div>
                      <p className="result-bar__label">
                        {finalAttempts === 1 ? 'FIRST TRY' : 'ATTEMPT'}
                      </p>
                    </>
                  );
                })()}
              </div>
              
              {/* Center: Next button + hint */}
              <div className="result-bar__center">
                <button className="result-bar__next-btn" onClick={handleResultBarContinue}>
                  <span className="result-bar__next-btn-content">
                    {currentRound >= 5 ? 'See Results' : 'Next'}
                  </span>
                </button>
                {!isMobile && (
                  <p className="result-bar__hint">
                    Hit <span className="result-bar__hotkey">Space</span> to continue
                  </p>
                )}
              </div>
              
              {/* Right: Score indicator */}
              <div className={`result-bar__right ${roundFailed ? 'result-bar__right--failed' : ''}`}>
                <span className={`result-bar__score ${roundFailed ? 'result-bar__score--failed' : ''}`}>
                  {animatedRoundScore.toLocaleString()}
                </span>
                <p className="result-bar__max-label">
                  {roundFailed ? 'Out of points' : 'Of 5,000 points'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Coaching tooltip - appears on first guess to teach hot/cold mechanic */}
      <CoachingTooltip 
        key={coachingTip.id}
        visible={coachingTip.visible}
        text={coachingTip.text}
        type={coachingTip.type || 'cold'}
        x={coachingTip.x}
        y={coachingTip.y}
        heatmapColor={coachingTip.heatmapColor}
        isOnVisibleSide={coachingTip.isOnVisibleSide}
      />

      {/* Round Indicator — top-left progress pips (shown between rounds) */}
      <RoundIndicator
        currentRound={currentRound}
        roundResults={roundResults}
        visible={showResultBar && !gameOver && firstRunComplete}
      />

      {/* Live Score Counter — GeoGuessr-style health bar */}
      <ScoreCounter
        attempts={attempts}
        roundFailed={roundFailed}
        damageKey={damageKey}
        visible={!!radioStation && !showResultBar && !gameOver && !showRoundModal && firstRunComplete && !correctGuess}
      />

      {/* Custom Audio Player */}
      {radioStation && (
        <div 
          className={`audio-player ${!audioPlayerEntranceComplete ? 'flip-in-bottom' : ''} ${isMobile && selectedCountry ? 'player-hidden' : ''}`}
          onAnimationEnd={(e) => {
            if (e.animationName === 'flipInBottom' && !audioPlayerEntranceComplete) {
              setAudioPlayerEntranceComplete(true);
            }
          }}
        >
          <button 
            onClick={toggleAudio} 
            className={`audio-btn ${!audioPlaying && !userPausedAudio ? 'audio-btn--pulse' : ''}`}
          >
            {audioPlaying ? 'Pause' : 'Play'}
          </button>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={volume} 
            onChange={onVolumeChange}
            className="volume-slider"
          />
          {/* Audio status indicator - grid container for proper gap collapse */}
          <div className={`audio-status ${isLoading || audioPlaying ? 'visible' : ''}`}>
            <div className="audio-status-inner">
              <div className={`loading-spinner ${isLoading ? 'visible' : ''}`}></div>
              <canvas 
                ref={canvasRef} 
                className={`audio-waveform-canvas ${!isLoading && audioPlaying ? 'visible' : ''}`}
                width={60}
                height={24}
              />
            </div>
          </div>
          <audio 
            ref={audioRef}
            crossOrigin="anonymous" 
            muted={false}   // NEW: Ensure audio is unmuted on play
            style={{ display: 'block' }}  // NEW: Make it visible for debugging (or remove to show custom player)
            onError={(e) => handleAudioError(e.target.error)}
          />
          {/* Error link - only show when there's an actual error (progressive disclosure) */}
          {audioError && (
            <div 
              className="radio-error" 
              onClick={callStationBroken}
            >
              Try another station
            </div>
          )}
        </div>
      )}

      {/* Globe Component */}
      <Globe
        ref={globeEl}
        width={width}
        height={height}
        globeMaterial={globeMaterial}
        backgroundColor="rgba(0,0,0,0)"
        showAtmosphere={true}
        atmosphereColor="rgb(80,160,255)"
        atmosphereAltitude={0.18}
        rendererConfig={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
          logarithmicDepthBuffer: true
        }}
        polygonsData={countriesData}
        polygonCapColor={(d) => {
          const polygonId = d.properties?.iso_a2 || d.properties?.name || d.id;
          const guess = guesses.find((g) => g.id === polygonId);
          
          if (guess) {
            return guess.color;
          }
          
          // Round failed: pulse between gold highlight and the heatmap "correct" color
          if (roundFailed && targetCountry && d.id === targetCountry.id) {
            return revealPulse ? '#FFC628' : '#b83700';
          }
          
          // Handle mobile selection — bright cyan highlight
          if (isMobile && selectedCountry?.polygonId === polygonId) {
            return '#00E5FF';
          }
          
          // Default color for all other cases
          return '#58CC02';
        }}
        polygonStrokeColor={d => {
          if (correctGuess && targetCountry && d.id === targetCountry.id) {
            return '#000000';  // black stroke for correct country
          }
          if (roundFailed && targetCountry && d.id === targetCountry.id) {
            return '#FFA43D';  // orange stroke for failed-round reveal
          }
          const polygonId = d.properties?.iso_a2 || d.properties?.name || d.id;
          if (isMobile && selectedCountry?.polygonId === polygonId) {
            return '#FFFFFF';  // white stroke for selected country
          }
          return '#1B5E20';  // dark green stroke for crisp border visibility
        }}
        polygonSideColor={d => {
          if (correctGuess && targetCountry && d.id === targetCountry.id) {
            return "#000000";  // solid color for sides when correct
          }
          if (roundFailed && targetCountry && d.id === targetCountry.id) {
            return '#D06429';  // dark orange sides for failed-round reveal
          }
          const polygonId = d.properties?.iso_a2 || d.properties?.name || d.id;
          if (isMobile && selectedCountry?.polygonId === polygonId) {
            return '#00ACC1';  // darker cyan sides for selected
          }
          return "#3DA30B";  // slightly darker green for sides
        }}
        polygonStrokeWidth={0.5}  // Increased stroke width
        polygonAltitude={d => {
          const polygonId = d.properties?.iso_a2 || d.properties?.name || d.id;
          const guess = guesses.find((g) => g.id === polygonId);
          if (guess && guess.altitude !== undefined) {
            return guess.altitude;
          }
          if (correctGuess && targetCountry && d.id === targetCountry.id) {
            return 0.025;  // extrude correct country
          }
          // Round failed: pulse the correct country up so it's unmissable
          if (roundFailed && targetCountry && d.id === targetCountry.id) {
            return revealPulse ? 0.05 : 0.03;  // pulsing altitude
          }
          if (hoveredPolygonId === polygonId) {
            return 0.025;  // raise hovered country
          }
          if (isMobile && selectedCountry?.polygonId === polygonId) {
            return 0.035;  // raise selected country on mobile
          }
          return 0.012;  // slight elevation for all countries to show borders
        }}
        polygonLabel={(d) => (!firstRunComplete || isMobile) ? null : `
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
        onGlobeClick={() => {
          if (isMobile && selectedCountry) setSelectedCountry(null);
        }}
        onPolygonHover={(polygon) => {
          if (!firstRunComplete || correctGuess || showResultBar || gameOver) {
            setHoveredPolygonId(null);
            return;
          }
          const id = polygon ? (polygon.properties?.iso_a2 || polygon.properties?.name || polygon.id) : null;
          setHoveredPolygonId(id);
        }}
        polygonsTransitionDuration={250}
        ringsData={selectionRing ? [selectionRing] : []}
        ringLat={d => d.lat}
        ringLng={d => d.lng}
        ringColor={() => t => `rgba(0, 229, 255, ${1 - t})`}
        ringMaxRadius={4}
        ringPropagationSpeed={5}
        ringRepeatPeriod={0}
        ringAltitude={0.015}
      />

      {/* Mobile selection card — swaps in place of audio player */}
      {isMobile && selectedCountry && (
        <div className="selection-card">
          <img
            className="selection-card__flag"
            src={`https://flagcdn.com/w80/${getCountryCode(selectedCountry)}.png`}
            alt={selectedCountry.properties?.name || 'Flag'}
            onError={(e) => { e.target.src = 'https://flagcdn.com/w80/un.png'; }}
          />
          <span className="selection-card__name">{selectedCountry.properties?.name || 'Unknown'}</span>
          <button
            className="selection-card__guess-btn"
            onClick={() => handleConfirmGuess()}
          >
            Guess
          </button>
        </div>
      )}

      {/* Continue button removed - now integrated into celebration mode in scoreboard */}

      {/* StartModal removed - first-run experience in index.html handles onboarding */}
      {/* RoundSummaryModal removed - celebration mode in scoreboard replaces it */}

      {/* Game Complete Modal */}
      <GameCompleteModal
        isOpen={gameOver}
        isClosing={modalClosing}
        onPlayAgain={playAgain}
        totalScore={score}
        roundResults={roundResults}
        volume={volume}
        onFlagError={handleFlagError}
      />
    </div>
  );
}

export default App;

