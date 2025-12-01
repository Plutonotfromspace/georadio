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

## Phase 4: Game Start (5-10s)

### What Happens
User clicks to start. The first-run screen fades out and the game begins.

### Transition Sequence

```
User Click
    ↓
firstRun.classList.add('hidden')     // Triggers fade-out
    ↓
setFirstRunComplete(true)            // React state update
    ↓
setTimeout(400ms)                    // Wait for CSS transition
    ↓
firstRun.style.display = 'none'      // Remove from DOM flow
    ↓
onGameStartRef.current()             // Start the game
```

### Fade-Out CSS
```css
.first-run.hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 0.4s ease-out, visibility 0.4s;
}
```

### Game Initialization (onGameStart)
```javascript
const onGameStart = useCallback(() => {
  logEvent('game', 'start', 'New game started');
  setGameStarted(true);
  setCurrentRound(1);
  setScore(0);
  setAnimatedScore(0);
  setUsedCountries([]);
  setUsedLanguages(new Set());
  startNewRound();
}, [startNewRound]);
```

### UI Elements That Appear

| Element | Timing | Animation |
|---------|--------|-----------|
| 3D Globe | Immediate | Renders with countries |
| Score Overlay | After `gameStarted=true` | Fade in |
| Audio Player | After station selected | Flip-in animation |

### Score Overlay (Only visible after game starts)
```
┌─────────────────────────────────────┐
│  SCORE          │    ROUND          │
│    0            │     1/5           │
└─────────────────────────────────────┘
```

### Audio Player UI
```
┌─────────────────────────────────────────────────────┐
│  [Play] │ Adjust volume: ═══════════○═══  │ 🔄    │
└─────────────────────────────────────────────────────┘
         │                                      │
     Play/Pause                          Station refresh
```

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

### Dieter Rams
- **#4 (Makes product understandable)**: Globe metaphor is instantly recognizable
- **#10 (As little design as possible)**: No modal, minimal text, colors teach themselves

### Don Norman
- **Feedback**: Immediate visual response to every action
- **Spatial Mapping**: Tooltips appear where user clicked
- **Progressive Disclosure**: UI elements appear when needed

### Jakob Nielsen
- **#1 (Visibility of system status)**: "Tuning in..." → "Ready to play"
- **#2 (Match between system and real world)**: Radio/tuning metaphor
- **#6 (Recognition rather than recall)**: Colors are self-explanatory

### Mobile-First
- Touch-friendly button sizing (44px+ touch targets)
- Responsive globe size: `min(280px, 60vw)`
- Works on any screen size

### Accessibility
- `role="status"` on first-run container
- `aria-live="polite"` for screen reader announcements
- Reduced motion support via `prefers-reduced-motion`
- Keyboard navigation (Enter to start)

---

## Summary

The first 30 seconds flow:

1. **0-100ms**: Instant paint with animated globe and "Tuning in..."
2. **100ms-2s**: Data loads in background (seamless to user)
3. **2-5s**: "Ready to play" appears with pulsing CTA button
4. **5-10s**: User clicks, first-run fades, game starts with audio
5. **10-30s**: User makes guesses, coaching tooltips teach mechanics (max 3)

**Result**: User is playing and understanding the game within 30 seconds, with zero reading required.
