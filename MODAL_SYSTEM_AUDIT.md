# 🎨 GeoRadio Modal System Audit — Phase 1 Discovery

**Audited by:** UX/UI Design Mastermind  
**Date:** December 2024  
**Repository:** georadio/georadio

---

## 📍 Executive Summary

GeoRadio uses **3 primary modal overlays** and **2 auxiliary UI elements** that function as overlay-like components. All modal code lives in a single `App.jsx` file (~1625 lines) with styles split across `App.css` (~5077 lines) and `index.css` (~68 lines).

**Key Finding:** No Tailwind CSS is used. The project uses plain CSS with CSS custom properties (design tokens) defined in `index.css`.

---

## 🎯 Design Tokens Found

Located in `/src/index.css`:

```css
:root {
  --primary-color: #00d0ff;
  --primary-dark: #0091c7;
  --primary-light: #80e7ff;
  --secondary-color: #ff9100;
  --secondary-dark: #c56200;
  --secondary-light: #ffc466;
  --dark-bg: #1a1c2e;
  --dark-surface: #2d3047;
  --light-text: #f0f2ff;
  --highlight: #00ffd9;
  --correct: #00ff8d;
  --warning: #ffce00;
  --danger: #ff5252;
  --game-heading: 'CustomHeader', 'Audiowide', cursive;
  --game-text: 'Regular', sans-serif;
  --game-pixel: 'Press Start 2P', cursive;
}
```

---

## 📦 Modal Inventory

### Modal #1: Start Modal (Welcome Screen)
**File:** `App.jsx` lines 1504-1546  
**CSS:** `App.css` lines 4958-5076

| Property | Details |
|----------|---------|
| **Component Name** | `start-modal-card` |
| **Purpose** | Welcome/onboarding screen before game starts |
| **Trigger** | Rendered when `gameStarted === false` |
| **State Dependencies** | `gameStarted` |
| **Dismissal Methods** | Click "Play" button only (no escape, no backdrop click) |
| **Animations** | `modalSlideIn` (0.3s ease-out) |
| **Mobile Behavior** | Responsive sizing (94% width at 480px) |
| **Scroll Locking** | Not explicitly implemented |

**Content Structure:**
- 🌍 Globe emoji icon
- "GeoRadio" title
- Instructions text
- Color legend (3 items: Very close, Getting warmer, Cold)
- "Play" CTA button
- Credits footer with link to Globle

**Accessibility Issues:**
- ❌ No `role="dialog"` or `aria-modal="true"`
- ❌ No focus trap
- ❌ No escape key handler
- ❌ No focus management on open/close
- ❌ Button lacks `aria-label`

---

### Modal #2: Round Summary Modal
**File:** `App.jsx` lines 1549-1576  
**CSS:** `App.css` lines 4542-4784

| Property | Details |
|----------|---------|
| **Component Name** | `round-summary-modal` |
| **Purpose** | Shows round results after correct guess |
| **Trigger** | Rendered when `showRoundModal === true` |
| **State Dependencies** | `showRoundModal`, `modalClosing`, `currentRound`, `roundResults`, `targetCountry`, `preloadedFlagUrl` |
| **Dismissal Methods** | Click "Next Round" / "See Results" button only |
| **Animations** | `modalSlideIn` (0.3s), `overlayFadeIn`/`overlayFadeOut`, `modalSlideOut` for closing |
| **Mobile Behavior** | Responsive (20px padding on mobile) |
| **Scroll Locking** | `overflow-y: auto` with touch scrolling support |

**Content Structure:**
- Country flag image (160x100px wrapper)
- Country name title
- Score inline ("+X points")
- "Next Round" / "See Results" button

**Accessibility Issues:**
- ❌ No `role="dialog"` or `aria-modal="true"`
- ❌ No focus trap
- ❌ No escape key handler
- ❌ No focus management
- ⚠️ Flag image has alt text (good!)

---

### Modal #3: Game Complete Modal
**File:** `App.jsx` lines 1579-1618  
**CSS:** `App.css` lines 4786-4956

| Property | Details |
|----------|---------|
| **Component Name** | `game-complete-modal` |
| **Purpose** | Final game over screen with total score and round recap |
| **Trigger** | Rendered when `gameOver === true` |
| **State Dependencies** | `gameOver`, `modalClosing`, `score`, `roundResults`, `countriesData` |
| **Dismissal Methods** | Click "Play Again" button only |
| **Animations** | Same as Round Summary (`modalSlideIn`, closing animations) |
| **Mobile Behavior** | 85vh max-height, touch scrolling enabled |
| **Scroll Locking** | `overflow-y: auto` with webkit touch scrolling |

**Content Structure:**
- Final score hero (large number + "points" label)
- Rounds summary list (5 items, each with flag, country name, score)
- "Play Again" button

**Accessibility Issues:**
- ❌ No `role="dialog"` or `aria-modal="true"`
- ❌ No focus trap
- ❌ No escape key handler
- ⚠️ Flag images have `onError` fallback (good!)
- ❌ No heading structure (`h1`/`h2` hierarchy)

---

## 🎛️ Auxiliary Overlay Components

### Component #4: Confirm Button (Mobile Only)
**File:** `App.jsx` lines 1485-1492  
**CSS:** `App.css` lines 569-596

| Property | Details |
|----------|---------|
| **Component Name** | `confirm-button` |
| **Purpose** | Mobile tap-to-confirm country selection |
| **Trigger** | Rendered when `isMobile && selectedCountry` |
| **Position** | Fixed bottom (80px), centered |
| **Animations** | Opacity transition |

---

### Component #5: Continue Button (Post-Correct Guess)
**File:** `App.jsx` lines 1495-1502  
**CSS:** `App.css` lines 648-703

| Property | Details |
|----------|---------|
| **Component Name** | `continue-button` |
| **Purpose** | Transition to round summary after correct guess |
| **Trigger** | Rendered when `correctGuess === true` |
| **Position** | Fixed bottom (40px), centered |
| **Animations** | `flipIn` / `flipOut` (3D rotation effects) |

---

### Component #6: Scoreboard Overlay
**File:** `App.jsx` lines 1369-1383  
**CSS:** `App.css` lines 25-38, 256-298, 747-832

| Property | Details |
|----------|---------|
| **Component Name** | `overlay` (with `stats-container`) |
| **Purpose** | Persistent HUD showing score and round |
| **Position** | Fixed top (20px), centered |
| **Animations** | Complex 5-stage flip animation sequence on correct guess |
| **Special Behavior** | Animates to center, scales up, then returns to top |

---

### Component #7: Audio Player
**File:** `App.jsx` lines 1387-1418  
**CSS:** `App.css` lines 202-253, 481-519

| Property | Details |
|----------|---------|
| **Component Name** | `audio-player` |
| **Purpose** | Radio controls with play/pause, volume, station refresh |
| **Position** | Fixed bottom (40px), centered |
| **Animations** | `flipOut` / `flipIn` / `flipInReset` |
| **Loading State** | Spinner (`loading-spinner` class) |

---

## 🎬 Animation Inventory

| Animation Name | Duration | Easing | Used By |
|---------------|----------|--------|---------|
| `modalSlideIn` | 0.3s | ease-out | All modals |
| `modalSlideOut` | 0.25s | ease-in | Modal closing |
| `overlayFadeIn` | 0.3s | ease-out | Modal backdrop |
| `overlayFadeOut` | 0.25s | ease-in | Modal backdrop closing |
| `flipOut` | 0.5s | ease-in-out | Audio player, continue button |
| `flipIn` | 0.5s | ease-in-out | Continue button |
| `flipInReset` | 0.5s | ease-in-out | Audio player reset |
| `flipOutToCenter` | 0.5s | ease-in-out | Scoreboard |
| `flipInFromCenter` | 0.5s | ease-in-out | Scoreboard |
| `flipOutFromCenter` | 0.5s | ease-in-out | Scoreboard |
| `flipInToTop` | 0.5s | ease-in-out | Scoreboard |
| `flagShine` | 2.5s | cubic-bezier | Flag reveal effect |

---

## 📱 Mobile-Specific Behavior

1. **Breakpoint:** `768px` is the primary mobile breakpoint
2. **Touch Scrolling:** Modals use `-webkit-overflow-scrolling: touch`
3. **Touch Action Override:** 
   ```css
   .modal-overlay, .modal-overlay * {
     touch-action: auto !important;
   }
   ```
4. **Confirm Button:** Only visible on mobile for tap-to-select workflow
5. **Scoreboard Scale:** Uses CSS variable `--scoreboard-scale: 1.5` on mobile (vs 2.5 desktop)

---

## 🚨 Critical Issues Identified

### Accessibility Violations (WCAG 2.2 AA)
1. **No Dialog Semantics** — Missing `role="dialog"`, `aria-modal="true"`, `aria-labelledby`
2. **No Focus Trap** — Users can tab outside modal while it's open
3. **No Escape Key** — No keyboard dismissal method
4. **No Focus Management** — Focus doesn't move to modal on open or return on close
5. **No Reduced Motion** — Animations don't respect `prefers-reduced-motion`

### Nielsen's Heuristics Violations
1. **User Control & Freedom (H3)** — No way to dismiss modals except button click
2. **Consistency & Standards (H4)** — Animation timings vary (0.25s vs 0.3s vs 0.5s)
3. **Error Prevention (H5)** — No confirmation for "Play Again" which resets game
4. **Recognition Over Recall (H6)** — Color legend only shown on start screen, not during game

### Code Quality Issues
1. **Massive Single File** — All modal logic in 1625-line `App.jsx`
2. **CSS Duplication** — Many repeated patterns (e.g., flag containers defined 3+ times)
3. **Magic Numbers** — Hard-coded values like `80px`, `40px`, `20px` for positioning
4. **No Component Extraction** — Modals are inline JSX, not reusable components
5. **State Explosion** — 25+ state variables managing modal-related behavior

---

## 📊 State Management for Modals

| State Variable | Type | Purpose |
|---------------|------|---------|
| `gameStarted` | boolean | Controls start modal visibility |
| `showRoundModal` | boolean | Controls round summary modal |
| `gameOver` | boolean | Controls game complete modal |
| `modalClosing` | boolean | Triggers closing animations |
| `correctGuess` | boolean | Triggers continue button + scoreboard animation |
| `continueFading` | boolean | Continue button fade state |
| `scoreboardAnimationStage` | string | Multi-stage scoreboard animation control |
| `scoreboardInMiddle` | boolean | Scoreboard position state |
| `selectedCountry` | object | Mobile country selection state |
| `preloadedFlagUrl` | string | Preloaded flag for modal |
| `isLoading` | boolean | Audio loading spinner state |

---

## 🔄 User Flows That Use Modals

### Flow 1: New Game Start
```
Start Modal → Click "Play" → Game Begins → Audio Plays
```

### Flow 2: Correct Guess → Next Round
```
Correct Guess → Audio Stops → Confetti → Scoreboard Animation (5 stages) 
→ Continue Button Appears → Click → Round Summary Modal → Click "Next Round" 
→ Modal Closes → New Round Begins
```

### Flow 3: Game Complete
```
Round 5 Correct → Continue Button → Round Summary Modal 
→ Click "See Results" → Game Complete Modal → Click "Play Again" 
→ Game Resets → Start Modal (optional) OR New Round
```

---

## 📁 File Structure Summary

```
src/
├── App.jsx           # All modal logic (1625 lines)
├── App.css           # All modal styles (5077 lines)
├── index.css         # Design tokens + global reset (68 lines)
├── main.jsx          # Entry point
└── services/
    └── analytics.js  # GA tracking
```

---

## ✅ Phase 1 Complete

---

# 📊 Phase 2 — Analysis

## 🏷️ Modal Grouping by Purpose

### Category A: Informational / Transitional Modals
These modals display information and require acknowledgment to proceed.

| Modal | Purpose | User Action Required |
|-------|---------|---------------------|
| Start Modal | Onboarding/instructions | Click "Play" to begin |
| Round Summary Modal | Show round results | Click "Next Round" or "See Results" |
| Game Complete Modal | Final score recap | Click "Play Again" |

**Pattern:** All are "blocking" modals that pause the main experience until dismissed.

### Category B: Contextual Action Elements
Fixed-position UI that appears based on game state, not blocking.

| Element | Purpose | Trigger |
|---------|---------|---------|
| Confirm Button | Mobile country selection | Tap on globe |
| Continue Button | Transition after correct guess | Correct answer |
| Audio Player | Radio controls | Always during gameplay |
| Scoreboard | Score/round HUD | Always visible |

**Pattern:** Non-blocking, contextual controls that enhance gameplay.

---

## 🗺️ Complete User Flow Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                         GEORADIO USER JOURNEY                        │
└─────────────────────────────────────────────────────────────────────┘

[PAGE LOAD]
     │
     ▼
┌─────────────┐
│ START MODAL │ ◄────────────────────────────────────────────┐
│  (Blocking) │                                               │
└──────┬──────┘                                               │
       │ Click "Play"                                         │
       ▼                                                      │
┌─────────────────────────────────────────────┐               │
│              GAMEPLAY LOOP                   │               │
│  ┌─────────────────────────────────────┐    │               │
│  │ • Audio Player visible (fixed)       │    │               │
│  │ • Scoreboard visible (fixed)         │    │               │
│  │ • Globe interactive                  │    │               │
│  └─────────────────────────────────────┘    │               │
│                    │                         │               │
│         [User guesses country]               │               │
│                    │                         │               │
│     ┌──────────────┴──────────────┐         │               │
│     │                              │         │               │
│  [WRONG]                       [CORRECT]     │               │
│     │                              │         │               │
│     ▼                              ▼         │               │
│  Country                    ┌─────────────┐  │               │
│  highlights                 │ • Audio stops│  │               │
│  with color                 │ • Confetti   │  │               │
│  (hot/cold)                 │ • Scoreboard │  │               │
│     │                       │   animates   │  │               │
│     │                       └──────┬──────┘  │               │
│     │                              │         │               │
│     │                              ▼         │               │
│     │                       ┌─────────────┐  │               │
│     │                       │  CONTINUE   │  │               │
│     │                       │   BUTTON    │  │               │
│     │                       │ (flip-in)   │  │               │
│     │                       └──────┬──────┘  │               │
│     │                              │ Click   │               │
│     │                              ▼         │               │
│     │               ┌───────────────────────┐│               │
│     │               │  ROUND SUMMARY MODAL  ││               │
│     │               │     (Blocking)        ││               │
│     │               │  • Flag + Country     ││               │
│     │               │  • Score earned       ││               │
│     │               └───────────┬───────────┘│               │
│     │                           │            │               │
│     │         ┌─────────────────┴────────────┤               │
│     │         │                              │               │
│     │    [Round < 5]                    [Round = 5]          │
│     │         │                              │               │
│     │         ▼                              ▼               │
│     │   Click "Next                   Click "See            │
│     │    Round"                        Results"             │
│     │         │                              │               │
│     └─────────┴──────────┐                   │               │
│                          │                   │               │
└──────────────────────────┘                   │               │
                                               ▼               │
                               ┌───────────────────────┐       │
                               │ GAME COMPLETE MODAL   │       │
                               │     (Blocking)        │       │
                               │  • Final score        │       │
                               │  • All 5 rounds recap │       │
                               └───────────┬───────────┘       │
                                           │                   │
                                           │ Click "Play Again"│
                                           │                   │
                                           └───────────────────┘
```

---

## 🔴 Top 5 Recurring Violations

### Violation #1: No Keyboard Accessibility (WCAG 2.1.1)
**Severity:** 🔴 Critical  
**Affected:** All 3 modals  
**Issue:** Users cannot dismiss modals with Escape key, cannot navigate with Tab, no focus trap  
**Impact:** Keyboard-only users and screen reader users cannot use the application  
**Fix Effort:** Medium (requires useEffect hook + event listeners)

### Violation #2: Missing Dialog Semantics (WCAG 4.1.2)
**Severity:** 🔴 Critical  
**Affected:** All 3 modals  
**Issue:** No `role="dialog"`, `aria-modal="true"`, or `aria-labelledby` attributes  
**Impact:** Screen readers don't announce modals as dialogs; users lose context  
**Fix Effort:** Low (add attributes to JSX)

### Violation #3: No Focus Management (WCAG 2.4.3)
**Severity:** 🟠 High  
**Affected:** All 3 modals  
**Issue:** Focus doesn't move to modal on open, doesn't return on close  
**Impact:** Users lose their place in the document; disorienting experience  
**Fix Effort:** Medium (requires refs + useEffect)

### Violation #4: No Reduced Motion Support (WCAG 2.3.3)
**Severity:** 🟠 High  
**Affected:** All animations (12 keyframe definitions)  
**Issue:** Animations don't respect `prefers-reduced-motion: reduce`  
**Impact:** Users with vestibular disorders may experience discomfort  
**Fix Effort:** Low (CSS media query wrapper)

### Violation #5: Inconsistent Animation Timing (Nielsen H4)
**Severity:** 🟡 Medium  
**Affected:** All modals and overlays  
**Issue:** Timings vary: 0.25s, 0.3s, 0.5s, 2.5s with no clear rationale  
**Impact:** Inconsistent feel, unpredictable behavior  
**Fix Effort:** Low (standardize to 2-3 timing values)

---

## 🔄 Duplication & Inconsistency Patterns

### CSS Duplication Analysis

| Pattern | Occurrences | Lines | Notes |
|---------|-------------|-------|-------|
| Flag container styles | 4× | ~120 lines | `.flag-container`, `.country-flag-wrapper`, `.round-summary-flag`, `.guess-mini-flag` |
| Button gradient styles | 5× | ~200 lines | Each button has unique gradient definition |
| Modal overlay backdrop | 3× | ~90 lines | Same blur + dark overlay repeated |
| Border-radius: 16px | 12× | scattered | Inconsistent (some 10px, 12px, 16px, 20px) |
| Box-shadow definitions | 15× | scattered | At least 6 unique shadow patterns |

### Naming Inconsistencies

| Concept | Variations Found |
|---------|------------------|
| Modal container | `start-modal-card`, `round-summary-modal`, `game-complete-modal`, `modal-card`, `summary-card` |
| Flag image | `country-flag-img`, `detected-flag`, `country-flag`, `round-summary-flag`, `guess-mini-flag` |
| Continue/Next button | `round-continue-btn`, `play-again-btn`, `continue-modal-button`, `action-button` |
| Score display | `final-score-hero`, `round-score-inline`, `score-value`, `final-score-number` |

### Animation Inconsistencies

| Category | Current Values | Recommendation |
|----------|---------------|----------------|
| Modal entrance | 0.3s ease-out | Standardize all |
| Modal exit | 0.25s ease-in | Standardize all |
| Button/element flips | 0.5s ease-in-out | OK (distinct) |
| Decorative (shine) | 2.5s cubic-bezier | OK (background) |

---

## 📈 Priority Matrix

| Issue | Severity | Effort | Priority Score | Recommendation |
|-------|----------|--------|----------------|----------------|
| Missing dialog semantics | Critical | Low | **P1** | Fix immediately |
| No keyboard accessibility | Critical | Medium | **P1** | Fix immediately |
| No focus management | High | Medium | **P2** | Fix in next sprint |
| No reduced motion | High | Low | **P2** | Quick win |
| Animation inconsistency | Medium | Low | **P3** | Refactor with above |
| CSS duplication | Medium | High | **P4** | Address during redesign |
| Component extraction | Low | High | **P5** | Future architecture |

---

## 🎯 Phase 2 Complete

**Summary of Analysis:**
- **3 blocking modals** follow the same pattern but lack accessibility
- **4 contextual elements** are well-positioned but use inconsistent animations
- **5 critical violations** against WCAG 2.2 AA and Nielsen's heuristics
- **CSS has significant duplication** (~400+ lines could be consolidated)
- **Naming is inconsistent** across similar components

---

**Next Steps (Phase 3 — Improvement Plan):**
1. Recommended unified modal architecture
2. Modern 2025 visual & interaction standards
3. Content & copy guidelines
4. Migration roadmap with quick wins
5. Code examples for the most common patterns

**Awaiting approval to proceed to Phase 3.**
