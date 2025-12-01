# GeoRadio First-Run Experience (0-30 Seconds)

> Complete documentation of every state, transition, and user interaction during the first 30 seconds of the app experience.

---

## Table of Contents
1. [Overview](#overview)
2. [Timeline](#timeline)
3. [Phase 1: Instant Load (0-100ms)](#phase-1-instant-load-0-100ms)
4. [Phase 2: Data Loading (100ms-2s)](#phase-2-data-loading-100ms-2s)
5. [Phase 3: Ready State (2-5s)](#phase-3-ready-state-2-5s)
6. [Phase 4: Game Start (5-10s)](#phase-4-game-start-5-10s)
7. [Phase 5: First Guess & Coaching (10-30s)](#phase-5-first-guess--coaching-10-30s)
8. [State Diagram](#state-diagram)
9. [Component Architecture](#component-architecture)
10. [Design Principles Applied](#design-principles-applied)

---

## Overview

The first-run experience is designed to get users playing within seconds, with zero modal barriers and contextual learning through gameplay. The philosophy is "learn by doing" rather than "read instructions first."

**Key Design Goals:**
- Instant visual feedback (no blank screens)
- Zero-modal onboarding (no "Welcome" dialogs)
- Contextual teaching (tooltips appear during gameplay)
- Progressive disclosure (reveal UI elements as needed)

---

## Timeline

```
0ms        100ms       500ms       1-2s         5s          10s         15-30s
|__________|___________|___________|____________|___________|___________|
   HTML      Title      Status     CTA Button   Game        First       Coaching
   Paint     Appears    Updates    Visible      Starts      Guess       Tooltips
```

---

## Phase 1: Instant Load (0-100ms)

### What Happens
The browser parses `index.html` and renders the first-run screen immediately using inline critical CSS.

### Visual State
![First-run loading screen](https://github.com/user-attachments/assets/1f0d1a2b-3862-4534-b9df-02f05dfea717)

### Elements Visible

| Element | State | Animation |
|---------|-------|-----------|
| Background | Dark gradient `#0f172a → #1e293b` | None |
| Animated Globe | Green sphere with continent shapes | `globeFloat` (4s ease-in-out infinite) |
| Radio Waves | 3 expanding circles | `waveExpand` (2s ease-out infinite, staggered) |
| Title "GeoRadio" | Hidden initially | `fadeSlideUp` (0.6s, 0.2s delay) |
| Status Text | Hidden initially | `fadeSlideUp` (0.6s, 0.4s delay) |
| CTA Button | `display: none` | - |
| Hint Text | Hidden initially | `fadeIn` (0.4s, 1s delay) |

### Text Content
```
Title: "GeoRadio"
Status: "Tuning in..."
Hint: "Press Enter or click anywhere"
```

### Technical Details
- **File**: `index.html` (lines 22-275 - inline CSS)
- **No JavaScript required** for initial paint
- **Preload hints** start fetching:
  - `/stations.json`
  - `https://unpkg.com` (country data)
  - `https://flagcdn.com` (flags)

### Animations (CSS)
```css
@keyframes globeFloat {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-8px) rotate(2deg); }
}

@keyframes waveExpand {
  0% { transform: scale(0.8); opacity: 0.6; }
  100% { transform: scale(1.5); opacity: 0; }
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

## Phase 2: Data Loading (100ms-2s)

### What Happens
React hydrates, and the app begins fetching required data in parallel.

### Network Requests

| Request | Source | Purpose | Typical Time |
|---------|--------|---------|--------------|
| `/stations.json` | Local | Radio station data (170 stations) | 50-200ms |
| `world-atlas@2/countries-110m.json` | unpkg.com | Country geometry for globe | 200-800ms |
| Google Fonts | fonts.googleapis.com | Custom fonts | 100-500ms |

### React State Initialization
```javascript
// App.jsx - Initial state values
const [countriesData, setCountriesData] = useState([]);
const [allStations, setAllStations] = useState([]);
const [gameStarted, setGameStarted] = useState(false);
const [firstRunComplete, setFirstRunComplete] = useState(false);
const [coachingTooltipCount, setCoachingTooltipCount] = useState(0);
const [lastGuessDistance, setLastGuessDistance] = useState(null);
const [wasGettingWarmer, setWasGettingWarmer] = useState(false);
```

### Visual State
- Globe continues animating
- Status text shows: **"Tuning in..."**
- No visible change to user (seamless loading)

---

## Phase 3: Ready State (2-5s)

### What Happens
Both `countriesData` and `allStations` are loaded. The app transitions to "ready" state.

### Trigger Condition
```javascript
// App.jsx lines 397-447
if (countriesData.length > 0 && Object.keys(allStations).length > 0 && !firstRunComplete) {
  // Update status and show CTA
  status.textContent = 'Ready to play';
  cta.style.display = 'flex';
  firstRun.classList.add('ready');
  
  setTimeout(() => {
    cta.classList.add('visible');
  }, 100);
}
```

### Visual Changes

| Element | Before | After |
|---------|--------|-------|
| Status Text | "Tuning in..." | **"Ready to play"** |
| CTA Button | Hidden | **Visible with pulse animation** |
| Cursor | Default | **Pointer (clickable)** |

### Text Content
```
Status: "Ready to play"
CTA Button: "🎧 Tap to tune in"
Hint: "Press Enter or click anywhere"
```

### CTA Button Animation
```css
.first-run__cta.visible {
  opacity: 1;
  transform: translateY(0);
  animation: ctaPulse 2s ease-in-out infinite;
}

@keyframes ctaPulse {
  0%, 100% { box-shadow: 0 4px 24px rgba(34, 197, 94, 0.4); }
  50% { box-shadow: 0 4px 32px rgba(34, 197, 94, 0.6); }
}
```

### User Input Handlers
Three ways to start the game:
1. **Click the CTA button** ("🎧 Tap to tune in")
2. **Click anywhere** on the first-run screen
3. **Press Enter** key

---

## Phase 4: Game Start — Detailed Breakdown (5-10s)

This phase covers everything that happens from the moment the user clicks until the game is fully playable. This is the most complex phase with multiple parallel processes.

### 4.1 User Click Event (T+0ms)

**Trigger**: User clicks CTA button, clicks anywhere on screen, or presses Enter

**Immediate Actions (synchronous)**:
```javascript
// App.jsx lines 415-426
const handleStart = () => {
  firstRun.classList.add('hidden');      // 1. Add CSS class for fade
  setFirstRunComplete(true);              // 2. Update React state
  
  setTimeout(() => {
    firstRun.style.display = 'none';      // 3. Remove from DOM flow
    if (onGameStartRef.current) {
      onGameStartRef.current();           // 4. Call game start function
    }
  }, 400);                                // Wait for CSS transition
};
```

### 4.2 First-Run Screen Fade-Out (T+0ms to T+400ms)

**CSS Transition**:
```css
.first-run.hidden {
  opacity: 0;                    /* Fade to invisible */
  visibility: hidden;            /* Remove from accessibility tree */
  pointer-events: none;          /* Prevent clicks during fade */
  transition: opacity 0.4s ease-out, visibility 0.4s;
}
```

**Visual State During Fade**:
- Animated globe fades out (400ms)
- "GeoRadio" title fades out
- "Ready to play" text fades out
- CTA button fades out
- Background gradient fades to reveal 3D globe behind

### 4.3 Game Initialization (T+400ms)

**`onGameStart()` function executes** (App.jsx lines 1204-1213):

```javascript
const onGameStart = useCallback(() => {
  // 1. Analytics event
  logEvent('game', 'start', 'New game started');
  
  // 2. State updates (all synchronous)
  setGameStarted(true);           // Triggers UI to show score overlay
  setCurrentRound(1);             // Initialize round counter
  setScore(0);                    // Reset score
  setAnimatedScore(0);            // Reset animated score display
  setUsedCountries([]);           // Clear used countries list
  setUsedLanguages(new Set());    // Clear used languages set
  
  // 3. Start first round
  startNewRound();                // Triggers station selection
}, [startNewRound]);
```

**State Changes**:
| State Variable | Before | After |
|----------------|--------|-------|
| `gameStarted` | `false` | `true` |
| `currentRound` | `1` | `1` |
| `score` | `0` | `0` |
| `animatedScore` | `0` | `0` |
| `usedCountries` | `[]` | `[]` |
| `usedLanguages` | `Set()` | `Set()` |

### 4.4 Round Initialization — `startNewRound()` (T+400ms to T+600ms)

**Station Selection Algorithm** (App.jsx lines 532-676):

```
Step 1: Group stations by language
         ↓
Step 2: Filter languages with valid stations
         ↓
Step 3: Pick random language (not recently used)
         ↓
Step 4: Get countries with stations in that language
         ↓
Step 5: Pick random country
         ↓
Step 6: Find country in map geometry data
         ↓
Step 7: Pick random station from that country
         ↓
Step 8: Set target country and radio station
```

**Detailed Steps**:

1. **Group stations by language**:
   ```javascript
   const stationsByLanguage = { /* 170 stations grouped */ };
   ```

2. **Filter valid languages** (must have at least 1 station):
   ```javascript
   const validLanguages = Object.entries(stationsByLanguage)
     .filter(([, stations]) => stations.length >= 1)
     .map(([lang]) => lang);
   ```

3. **Pick random language** (excluding recently used):
   ```javascript
   let availableLanguages = validLanguages.filter(lang => !usedLanguages.has(lang));
   const randomLanguage = availableLanguages[Math.floor(Math.random() * availableLanguages.length)];
   ```

4. **Get available countries**:
   ```javascript
   const availableCountries = [...new Set(stationsInLanguage.map(s => s.sourceCountry))];
   ```

5. **Pick random country**:
   ```javascript
   const randomCountry = availableCountries[Math.floor(Math.random() * availableCountries.length)];
   ```

6. **Find country in map data**:
   ```javascript
   const target = countriesData.find(
     feature => feature.properties?.name.toLowerCase() === randomCountry.toLowerCase()
   );
   ```

7. **Pick random station**:
   ```javascript
   const stationsForCountry = stationsInLanguage.filter(s => s.sourceCountry === randomCountry);
   const station = stationsForCountry[Math.floor(Math.random() * stationsForCountry.length)];
   ```

8. **Set state**:
   ```javascript
   setRadioStation({ ...station, url_resolved: stationUrl });
   setTargetCountry(target);
   setAttempts(0);
   setLastGuessDistance(null);
   setWasGettingWarmer(false);
   setCoachingTip(prev => ({ ...prev, visible: false }));
   ```

### 4.5 Audio Setup (T+600ms to T+1000ms)

**`setupAudioSource()` function** (App.jsx lines 213-236):

```javascript
const setupAudioSource = useCallback((stationUrl) => {
  const audioElement = audioRef.current;
  
  // 1. Set CORS mode
  audioElement.crossOrigin = "anonymous";
  
  // 2. Cleanup existing HLS instance if any
  if (audioElement.hlsInstance) {
    audioElement.hlsInstance.destroy();
    audioElement.hlsInstance = null;
  }
  
  // 3. Setup new source (HLS or direct)
  if (Hls.isSupported() && stationUrl.endsWith('.m3u8')) {
    const hls = new Hls();
    hls.loadSource(stationUrl);
    hls.attachMedia(audioElement);
    audioElement.hlsInstance = hls;
  } else {
    audioElement.src = stationUrl;
  }
  
  // 4. Start loading
  audioElement.load();
}, []);
```

**Audio States**:
| State | Meaning |
|-------|---------|
| `isLoading: true` | Audio is buffering |
| `audioPlaying: false` | Audio is paused (default) |
| Audio element loading | Network request in progress |

### 4.6 UI Elements Appear (T+400ms to T+1000ms)

**Elements that become visible when `gameStarted = true`**:

1. **Score Overlay** (conditional render):
   ```jsx
   {gameStarted && (
     <div className={`overlay ${scoreboardAnimationStage}`}>
       <div className="stats-container">
         <div className="stat-item">
           <span className="stat-label">SCORE</span>
           <span className="stat-value">{animatedScore}</span>
         </div>
         <div className="stat-divider"></div>
         <div className="stat-item">
           <span className="stat-label">ROUND</span>
           <span className="stat-value">{currentRound}<span className="stat-max">/5</span></span>
         </div>
       </div>
     </div>
   )}
   ```

2. **Audio Player** (appears when `radioStation` is set):
   ```jsx
   {radioStation && (
     <div className="audio-player">
       <button onClick={toggleAudio} className="audio-btn">
         {audioPlaying ? 'Pause' : 'Play'}
       </button>
       <span className="audio-instructions">
         {audioPlaying ? 'Adjust volume:' : 'Click Play if audio does not start.'}
       </span>
       <input type="range" min="0" max="100" value={volume} onChange={onVolumeChange} />
       {isLoading && <div className="loading-spinner"></div>}
       <audio ref={audioRef} />
     </div>
   )}
   ```

3. **3D Globe** (already rendered, now interactive):
   - Countries become clickable
   - Hover effects enabled
   - Rotation/zoom enabled

### 4.7 Audio Playback Attempt (T+1000ms+)

**Automatic play attempt** (triggered by audio `canplaythrough` event or user interaction):

```javascript
audioRef.current.play()
  .then(() => {
    setIsLoading(false);
    setAudioPlaying(true);
  })
  .catch((e) => {
    // Handle autoplay blocked or network error
    console.error("Audio playback error:", e);
    callStationBroken();  // Try another station
  });
```

**Possible Outcomes**:
| Outcome | What Happens |
|---------|--------------|
| Success | Audio plays, `audioPlaying = true`, user hears radio |
| Autoplay blocked | User must click Play button manually |
| Network error | Station refreshes automatically, tries new station |
| CORS error | Station refreshes automatically |

### 4.8 Final State (T+1000ms to T+2000ms)

**Game is now fully playable**:

| Component | State | User Action Available |
|-----------|-------|----------------------|
| Globe | Interactive | Click countries to guess |
| Audio Player | Playing or ready | Play/Pause, volume control |
| Score Overlay | Showing "0" and "1/5" | View progress |
| Countries | Default color (land) | Click to make guess |

### Visual Timeline Summary

```
T+0ms      T+100ms    T+200ms    T+400ms    T+600ms    T+1000ms   T+2000ms
|__________|__________|__________|__________|__________|__________|
    ↓           ↓           ↓           ↓           ↓           ↓
  Click     Fade       Fade       Fade      Round     Audio      Game
  Event     25%        50%        Done      Init      Setup      Ready
                                    ↓
                              onGameStart()
                                    ↓
                              startNewRound()
                                    ↓
                              setRadioStation()
                                    ↓
                              setupAudioSource()
```

### Score Overlay Visual
```
┌─────────────────────────────────────┐
│  SCORE          │    ROUND          │
│    0            │     1/5           │
└─────────────────────────────────────┘
```

### Audio Player Visual
```
┌─────────────────────────────────────────────────────┐
│  [Play] │ Click Play if audio does not start. │ 🔄 │
└─────────────────────────────────────────────────────┘
         │                                        │
     Play/Pause                            Station refresh
     
After playing:
┌─────────────────────────────────────────────────────┐
│ [Pause] │ Adjust volume: ═══════════○═══════  │ 🔄 │
└─────────────────────────────────────────────────────┘
```

### Error Handling During Phase 4

| Error | Detection | Recovery |
|-------|-----------|----------|
| Station URL invalid | `onerror` event | `callStationBroken()` → new station |
| CORS blocked | Error code 2/3/4 | `callStationBroken()` → new station |
| No countries found | `!target` check | `startNewRound()` → try different language |
| HLS not supported | `Hls.isSupported()` | Fall back to direct audio source |

---

## Phase 5: First Guess & Coaching (10-30s)

### What Happens
User clicks countries on the globe. Coaching tooltips appear to teach the hot/cold mechanic.

### Coaching Tooltip System

**Maximum tooltips shown:** 3

**Tooltip triggers:**

| Scenario | Tooltip Text | Color |
|----------|--------------|-------|
| First guess, very close (<500km) | "So close! 🔥" | Red (hot) |
| First guess, close (<2000km) | "Getting warm!" | Orange (warm) |
| First guess, medium (<5000km) | "A bit far — keep trying!" | Light blue (cool) |
| First guess, far (>5000km) | "Cold — try another region ❄️" | Blue (cold) |
| Getting warmer than previous | "Getting warmer! 🔥" | Orange (warm) |
| Getting colder after warming | "Getting colder! ❄️" | Light blue (cool) |

### Coaching Tooltip Logic
```javascript
// Only show coaching tooltips if we haven't shown 3 yet
if (coachingTooltipCount < 3) {
  if (lastGuessDistance === null) {
    // First guess: distance-based feedback
    showCoachingTooltip(coachText, coachType);
  } else {
    const isWarmer = distance < lastGuessDistance;
    
    if (isWarmer && !wasGettingWarmer) {
      showCoachingTooltip('Getting warmer! 🔥', 'warm');
      setWasGettingWarmer(true);
    } else if (!isWarmer && wasGettingWarmer) {
      showCoachingTooltip('Getting colder! ❄️', 'cool');
      setWasGettingWarmer(false);
    }
  }
}
```

### Tooltip Behavior
- **Appears**: Above the clicked country on the globe
- **Duration**: Auto-hides after 4 seconds
- **Position tracking**: Updates position when globe rotates/zooms
- **Visibility**: Hides if country rotates behind globe

### Globe-Locked Positioning
```javascript
// Continuously update tooltip position when globe moves
useEffect(() => {
  if (!coachingTip.visible || !globeEl.current) return;
  
  let animationFrameId;
  const updateTooltipPosition = () => {
    const screenCoords = globeEl.current.getScreenCoords(coachingTip.lat, coachingTip.lon);
    // Update position or hide if behind globe
    animationFrameId = requestAnimationFrame(updateTooltipPosition);
  };
  
  animationFrameId = requestAnimationFrame(updateTooltipPosition);
  return () => cancelAnimationFrame(animationFrameId);
}, [coachingTip.visible, coachingTip.lat, coachingTip.lon]);
```

### Country Color Feedback (Heat Map)
Countries change color based on distance from target:

| Distance | Color | Meaning |
|----------|-------|---------|
| < 500km | Deep Red `#b83700` | Very close! |
| 500-2000km | Orange `#fe7835` | Getting warmer |
| 2000-5000km | Light Orange | Warm |
| > 5000km | Cream `#fef2dc` | Cold |

---

## State Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FIRST-RUN EXPERIENCE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐      ┌──────────┐      ┌──────────┐             │
│   │  LOADING │ ───▶ │  READY   │ ───▶ │  HIDDEN  │             │
│   └──────────┘      └──────────┘      └──────────┘             │
│        │                  │                  │                  │
│   "Tuning in..."    "Ready to play"    Fade out                │
│   Globe animates     CTA visible      (400ms)                   │
│                     Click/Enter                                  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                          GAME STATE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐      ┌──────────┐      ┌──────────┐             │
│   │  INIT    │ ───▶ │ PLAYING  │ ───▶ │ GUESSING │             │
│   └──────────┘      └──────────┘      └──────────┘             │
│        │                  │                  │                  │
│   Start round       Audio plays        User clicks              │
│   Select station    Globe visible      countries                │
│                                                                  │
│                     ┌──────────────────────────────┐            │
│                     │     COACHING TOOLTIPS        │            │
│                     ├──────────────────────────────┤            │
│                     │ Count: 0/3  1/3  2/3  3/3   │            │
│                     │ State: first → warmer/colder │            │
│                     └──────────────────────────────┘            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Architecture

### Files Involved

```
index.html                    # First-run screen HTML + critical CSS
├── #first-run               # Loading/ready overlay
├── #first-run-status        # Status text element
├── #first-run-cta           # Start button
└── #root                    # React app mount point

src/
├── App.jsx                  # Main game logic
│   ├── First-run handlers   # Lines 396-447
│   ├── Coaching system      # Lines 726-804
│   └── Globe rendering      # Lines 1500+
│
└── components/
    └── CoachingTooltip/
        ├── CoachingTooltip.jsx   # Tooltip component
        └── CoachingTooltip.css   # Tooltip styles
```

### State Variables for First-Run

```javascript
// First-run tracking
const [firstRunComplete, setFirstRunComplete] = useState(false);

// Game state
const [gameStarted, setGameStarted] = useState(false);
const [currentRound, setCurrentRound] = useState(1);
const [score, setScore] = useState(0);

// Coaching system
const [coachingTooltipCount, setCoachingTooltipCount] = useState(0);
const [lastGuessDistance, setLastGuessDistance] = useState(null);
const [wasGettingWarmer, setWasGettingWarmer] = useState(false);
const [coachingTip, setCoachingTip] = useState({
  visible: false,
  text: '',
  type: '',
  x: 0,
  y: 0,
  lat: 0,
  lon: 0
});
```

---

## Design Principles Applied

### Overview

This section documents how design principles are applied to every UI element that appears in the first 30 seconds.

### First-Run Screen

#### Dieter Rams
- **#4 (Makes product understandable)**: Globe metaphor is instantly recognizable
- **#10 (As little design as possible)**: No modal, minimal text, colors teach themselves

#### Don Norman
- **Feedback**: Immediate visual response to every action
- **Spatial Mapping**: Tooltips appear where user clicked
- **Progressive Disclosure**: UI elements appear when needed

#### Jakob Nielsen
- **#1 (Visibility of system status)**: "Tuning in..." → "Ready to play"
- **#2 (Match between system and real world)**: Radio/tuning metaphor
- **#6 (Recognition rather than recall)**: Colors are self-explanatory

---

### Score Overlay (appears at T+400ms)

The score overlay displays at the top of the screen showing SCORE and ROUND.

```
┌─────────────────────────────────────┐
│  SCORE          │    ROUND          │
│    0            │     1/5           │
└─────────────────────────────────────┘
```

#### Design Principles Applied

| Principle | Implementation |
|-----------|----------------|
| **Rams #2 (Makes product useful)** | Shows only essential info: score and round progress |
| **Rams #5 (Unobtrusive)** | Semi-transparent background (rgba 255,255,255,0.7), doesn't block globe |
| **Rams #10 (As little design as possible)** | Two numbers, two labels, nothing else |
| **Norman: Visibility** | Always visible at fixed position (top center) |
| **Norman: Feedback** | Score animates when points are earned |
| **Nielsen #1 (System status)** | Round counter shows progress (1/5, 2/5, etc.) |
| **Nielsen #4 (Consistency)** | Same position and style throughout game |
| **8px Grid System** | Padding: 8px 16px, border-radius: 8px, gap: 4px |

#### Typography
- **Labels**: 12px, uppercase, 0.05em letter-spacing, 70% opacity
- **Values**: 24px, bold weight 700
- **Round max**: 18px, 50% opacity

#### Spacing (8px grid compliance)
- Container padding: 8px vertical, 16px horizontal
- Stat gap: 4px (half-unit)
- Divider height: 24px (3 units)

---

### Audio Player (appears at T+600ms)

The audio player displays at the bottom of the screen with playback controls.

```
Before playing:
┌─────────────────────────────────────────────────────┐
│  [Play] │ Click Play if audio does not start. │ 🔄 │
└─────────────────────────────────────────────────────┘

After playing:
┌─────────────────────────────────────────────────────┐
│ [Pause] │ Adjust volume: ═══════════○═══════  │ 🔄 │
└─────────────────────────────────────────────────────┘
```

#### Design Principles Applied

| Principle | Implementation |
|-----------|----------------|
| **Rams #2 (Useful)** | Only essential controls: Play/Pause, volume, refresh |
| **Rams #5 (Unobtrusive)** | Dark semi-transparent background (rgba 0,0,0,0.8), sits at bottom |
| **Rams #10 (Minimal)** | Three elements only, no decorative additions |
| **Norman: Affordances** | Button looks clickable, slider looks draggable |
| **Norman: Feedback** | Button text changes (Play → Pause), loading spinner when buffering |
| **Norman: Mapping** | Volume slider: left = quieter, right = louder (natural mapping) |
| **Nielsen #1 (System status)** | Loading spinner shows buffering state |
| **Nielsen #5 (Error prevention)** | "Station broken? Click here to refresh" appears proactively |
| **Nielsen #9 (Error recovery)** | Easy station refresh with yellow underlined text |
| **8px Grid System** | Padding: 12px 16px, gap: 8px, border-radius: 8px |

#### States

| State | Visual Indicator | User Action |
|-------|------------------|-------------|
| Loading | Spinner visible | Wait |
| Ready | Play button enabled | Click Play |
| Playing | Pause button, volume slider | Adjust volume or pause |
| Error | Yellow "Station broken?" link | Click to refresh |

#### Typography
- **Button**: 14px, white on transparent, 1px white border
- **Instructions**: 12px, white, changes based on state
- **Error link**: 12px, yellow (#ffeb3b), underlined

#### Spacing (8px grid compliance)
- Container padding: 12px vertical, 16px horizontal
- Element gap: 8px
- Volume slider width: 100px
- Border radius: 8px (container), 4px (button)

---

### Coaching Tooltip (appears on first guess)

Floating tooltip that appears on the globe near clicked countries.

#### Design Principles Applied

| Principle | Implementation |
|-----------|----------------|
| **Rams #4 (Understandable)** | Plain language: "Getting warmer!", "Getting colder!" |
| **Rams #10 (Minimal)** | Single line of text, auto-dismisses after 4 seconds |
| **Norman: Spatial Mapping** | Appears exactly where user clicked, follows globe rotation |
| **Norman: Feedback** | Immediate response to guess, color matches temperature |
| **Norman: Conceptual Model** | Hot/cold metaphor universally understood |
| **Nielsen #1 (System status)** | Tells user if they're getting closer or farther |
| **Nielsen #6 (Recognition)** | Color gradient (red→blue) matches real-world temperature |
| **8px Grid System** | Padding: 12px 20px, border-radius: 24px |

#### Color System

| Type | Background | Meaning |
|------|------------|---------|
| Hot | `#dc2626 → #b91c1c` | Very close (<500km) |
| Warm | `#f97316 → #ea580c` | Getting closer (<2000km) |
| Cool | `#0ea5e9 → #0284c7` | Getting farther (2000-5000km) |
| Cold | `#3b82f6 → #2563eb` | Far away (>5000km) |

---

### Mobile-First Considerations

All components that appear in the first 30 seconds follow mobile-first principles:

| Component | Mobile Adaptation |
|-----------|-------------------|
| **First-run screen** | Globe: `min(280px, 60vw)`, CTA: 14px padding |
| **Score overlay** | Max-width: 80vw, responsive font sizes |
| **Audio player** | Full-width on small screens, touch-friendly slider |
| **Coaching tooltip** | Position clamped within viewport bounds |

#### Touch Target Compliance (44px minimum)

| Element | Size | Compliance |
|---------|------|------------|
| CTA Button | 48px height | ✅ |
| Play/Pause button | ~32px (with padding) | ⚠️ Could improve |
| Volume slider | Native input | ✅ Browser handles |
| Station refresh | 24px+ tap area | ✅ |

---

### Accessibility

All first-30-second components include accessibility features:

| Component | Feature |
|-----------|---------|
| **First-run** | `role="status"`, `aria-live="polite"`, keyboard navigation |
| **Score overlay** | Semantic HTML, visible focus states |
| **Audio player** | Button labels, slider accessible |
| **Coaching tooltip** | `role="status"`, `aria-live="polite"` |
| **All components** | `prefers-reduced-motion` support |

---

## Summary

The first 30 seconds flow:

1. **0-100ms**: Instant paint with animated globe and "Tuning in..."
2. **100ms-2s**: Data loads in background (seamless to user)
3. **2-5s**: "Ready to play" appears with pulsing CTA button
4. **5-10s**: User clicks, first-run fades, game starts with audio
5. **10-30s**: User makes guesses, coaching tooltips teach mechanics (max 3)

**Result**: User is playing and understanding the game within 30 seconds, with zero reading required.
