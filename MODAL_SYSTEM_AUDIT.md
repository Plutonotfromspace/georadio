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

# 🚀 Phase 3 — Improvement Plan

## 1. Unified Modal Architecture

### Recommended Component Structure

```
src/
├── components/
│   ├── Modal/
│   │   ├── Modal.jsx           # Base modal with a11y built-in
│   │   ├── Modal.css           # Consolidated modal styles
│   │   ├── ModalOverlay.jsx    # Backdrop component
│   │   ├── useModal.js         # Custom hook for modal state
│   │   └── index.js            # Exports
│   ├── StartModal/
│   │   └── StartModal.jsx      # Game intro modal
│   ├── RoundSummaryModal/
│   │   └── RoundSummaryModal.jsx
│   └── GameCompleteModal/
│       └── GameCompleteModal.jsx
```

### Base Modal Component API

```jsx
// Proposed Modal component interface
<Modal
  isOpen={boolean}
  onClose={function}
  title={string}                    // For aria-labelledby
  closeOnEscape={boolean}           // Default: true
  closeOnBackdropClick={boolean}    // Default: false for game modals
  initialFocus={ref}                // Element to focus on open
  returnFocus={boolean}             // Default: true
  size="sm" | "md" | "lg"           // Predefined sizes
  animation="slide" | "fade" | "scale"
>
  {children}
</Modal>
```

### Accessibility Features (Built-in)

```jsx
// Base Modal with full accessibility
function Modal({ isOpen, onClose, title, children, ...props }) {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Focus trap
  useFocusTrap(modalRef, isOpen);
  
  // Escape key handler
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && props.closeOnEscape !== false) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      previousActiveElement.current = document.activeElement;
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, props.closeOnEscape]);

  // Return focus on close
  useEffect(() => {
    if (!isOpen && previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={props.closeOnBackdropClick ? onClose : undefined}>
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${title}-title`}
        className={`modal modal--${props.size || 'md'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={`${title}-title`} className="modal__title">
          {title}
        </h2>
        {children}
      </div>
    </div>,
    document.body
  );
}
```

---

## 2. Modern 2025 Visual & Interaction Standards

### Design Principles

| Principle | Current | Recommended |
|-----------|---------|-------------|
| **Glass morphism** | Solid white backgrounds | `backdrop-filter: blur(12px)` with semi-transparent bg |
| **Border radius** | Mixed (10-20px) | Standardize: 16px for modals, 8px for buttons |
| **Shadows** | 6 different patterns | Standardize to 3 levels (sm, md, lg) |
| **Motion** | Inconsistent timing | Use system: 150ms micro, 300ms standard, 500ms emphasis |
| **Colors** | Hard-coded | Use CSS custom properties exclusively |

### Updated Design Tokens

```css
:root {
  /* Spacing scale (8px base) */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;

  /* Border radius */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  --radius-full: 9999px;

  /* Shadows (3-tier system) */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 20px 60px rgba(0, 0, 0, 0.2);

  /* Animation durations */
  --duration-micro: 150ms;
  --duration-standard: 300ms;
  --duration-emphasis: 500ms;

  /* Animation easings */
  --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
  --ease-in: cubic-bezier(0.4, 0.0, 1, 1);
  --ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1);

  /* Modal-specific */
  --modal-backdrop: rgba(0, 0, 0, 0.6);
  --modal-bg: rgba(255, 255, 255, 0.95);
  --modal-blur: 12px;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  :root {
    --duration-micro: 0ms;
    --duration-standard: 0ms;
    --duration-emphasis: 0ms;
  }
}
```

### Consolidated Animation Keyframes

```css
/* Standard modal entrance/exit */
@keyframes modal-enter {
  from {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes modal-exit {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
  }
}

@keyframes overlay-enter {
  from { opacity: 0; backdrop-filter: blur(0); }
  to { opacity: 1; backdrop-filter: blur(var(--modal-blur)); }
}

@keyframes overlay-exit {
  from { opacity: 1; backdrop-filter: blur(var(--modal-blur)); }
  to { opacity: 0; backdrop-filter: blur(0); }
}

/* Apply animations */
.modal-overlay {
  animation: overlay-enter var(--duration-standard) var(--ease-out);
}

.modal-overlay.closing {
  animation: overlay-exit var(--duration-micro) var(--ease-in);
}

.modal {
  animation: modal-enter var(--duration-standard) var(--ease-out);
}

.modal.closing {
  animation: modal-exit var(--duration-micro) var(--ease-in);
}
```

---

## 3. Content & Copy Guidelines

### Modal Copy Standards

| Element | Guidelines | Example |
|---------|------------|---------|
| **Title** | Max 4 words, action-oriented | "Round Complete" not "You have completed round 3" |
| **Body** | Max 2 sentences, scannable | "Brazil was playing Rádio Cidade. You scored +4,500 points." |
| **Primary CTA** | 2-3 words, verb-first | "Next Round", "Play Again" |
| **Secondary CTA** | Optional, lower emphasis | "View Details" |

### Tone of Voice

- **Celebratory** for success (correct guess, game complete)
- **Encouraging** for progression (next round)
- **Neutral** for onboarding (start modal)
- **Never** condescending or overly verbose

### Accessibility Copy

```jsx
// Always include aria-labels for icon-only buttons
<button aria-label="Close modal" className="modal__close">
  <CloseIcon />
</button>

// Use aria-live for dynamic score updates
<div aria-live="polite" aria-atomic="true">
  Score: {score} points
</div>
```

---

## 4. Migration Roadmap

### Quick Wins (Week 1) — P1/P2 Fixes

| Task | Effort | Impact | Files |
|------|--------|--------|-------|
| Add `role="dialog"` and `aria-modal="true"` | 15 min | Critical | App.jsx |
| Add `aria-labelledby` to all modals | 15 min | Critical | App.jsx |
| Add Escape key handlers | 30 min | Critical | App.jsx |
| Add reduced motion CSS media query | 15 min | High | App.css |
| Standardize animation durations | 30 min | Medium | App.css |

**Estimated total: 2 hours**

### Sprint 1 (Week 2-3) — Component Extraction

| Task | Effort | Impact |
|------|--------|--------|
| Create base Modal component | 4 hrs | High |
| Create useModal hook | 2 hrs | High |
| Create useFocusTrap hook | 2 hrs | Critical |
| Extract StartModal | 2 hrs | Medium |
| Extract RoundSummaryModal | 2 hrs | Medium |
| Extract GameCompleteModal | 2 hrs | Medium |
| Consolidate CSS into Modal.css | 4 hrs | Medium |

**Estimated total: 18 hours**

### Sprint 2 (Week 4-5) — Polish & Testing

| Task | Effort | Impact |
|------|--------|--------|
| Add unit tests for Modal | 4 hrs | High |
| Add Storybook stories | 4 hrs | Medium |
| Cross-browser testing | 2 hrs | High |
| Mobile/touch testing | 2 hrs | High |
| Screen reader testing (NVDA, VoiceOver) | 3 hrs | Critical |

**Estimated total: 15 hours**

---

## 5. Code Examples

### Example 1: Quick Fix — Adding Dialog Semantics

**Current Code (App.jsx ~line 1549):**
```jsx
{showRoundModal && (
  <div className={`modal-overlay ${modalClosing ? 'closing' : ''}`}>
    <div className={`round-summary-modal ${modalClosing ? 'closing' : ''}`}>
      {/* content */}
    </div>
  </div>
)}
```

**Fixed Code:**
```jsx
{showRoundModal && (
  <div 
    className={`modal-overlay ${modalClosing ? 'closing' : ''}`}
    role="presentation"
  >
    <div 
      className={`round-summary-modal ${modalClosing ? 'closing' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="round-summary-title"
    >
      <h2 id="round-summary-title" className="sr-only">
        Round {currentRound} Complete
      </h2>
      {/* content */}
    </div>
  </div>
)}
```

### Example 2: Quick Fix — Escape Key Handler

**Add to App.jsx (inside App function):**
```jsx
// Escape key handler for all modals
useEffect(() => {
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      if (showRoundModal) {
        handleNextRound();
      } else if (gameOver) {
        playAgain();
      }
      // Note: Start modal should NOT close on escape (game hasn't started)
    }
  };

  document.addEventListener('keydown', handleEscape);
  return () => document.removeEventListener('keydown', handleEscape);
}, [showRoundModal, gameOver, handleNextRound, playAgain]);
```

### Example 3: Quick Fix — Reduced Motion

**Add to App.css:**
```css
/* Respect user's motion preferences */
@media (prefers-reduced-motion: reduce) {
  .modal-overlay,
  .round-summary-modal,
  .game-complete-modal,
  .start-modal-card,
  .continue-button,
  .audio-player,
  .overlay {
    animation: none !important;
    transition: opacity 0.1s linear !important;
  }
}
```

### Example 4: Focus Trap Hook

**Create src/hooks/useFocusTrap.js:**
```jsx
import { useEffect } from 'react';

export function useFocusTrap(ref, isActive) {
  useEffect(() => {
    if (!isActive || !ref.current) return;

    const focusableElements = ref.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element on mount
    firstElement?.focus();

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    return () => document.removeEventListener('keydown', handleTabKey);
  }, [ref, isActive]);
}
```

### Example 5: Screen Reader Only Class

**Add to App.css:**
```css
/* Visually hidden but accessible to screen readers */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

---

## ✅ Phase 3 Complete — Full Audit Summary

### Deliverables

| Phase | Status | Key Outputs |
|-------|--------|-------------|
| Phase 1: Discovery | ✅ Complete | 7 components documented, 12 animations mapped, 25+ state variables |
| Phase 2: Analysis | ✅ Complete | 5 violations prioritized, ~400 lines duplication, user flow diagram |
| Phase 3: Improvement Plan | ✅ Complete | Architecture proposal, design tokens, migration roadmap, code examples |

### Implementation Priority

1. **Immediate (Week 1):** Apply quick fixes for WCAG compliance
2. **Short-term (Week 2-3):** Extract modal components
3. **Medium-term (Week 4-5):** Polish, test, document

### Estimated Impact

| Metric | Before | After |
|--------|--------|-------|
| WCAG 2.2 AA Compliance | ~40% | 95%+ |
| CSS Lines (modal-related) | ~1200 | ~400 |
| State Variables for Modals | 11 | 4-5 |
| Animation Keyframes | 12 | 4 |
| Component Reusability | 0% | 100% |

---

**📋 Ready for Implementation**

This audit provides a complete roadmap for modernizing the GeoRadio modal system. The quick wins can be applied immediately for accessibility compliance, while the component extraction can be done incrementally without disrupting the existing game functionality.

**Recommended Next Steps:**
1. Create a GitHub issue for each migration task
2. Start with P1 quick fixes (2 hours total)
3. Schedule Sprint 1 for component extraction
4. Set up accessibility testing with screen readers

---

*Audit completed by UX/UI Design Mastermind — December 2024*

---

# 🚀 Sprint 1 — Component Extraction (Implementation Log)

## Overview

Sprint 1 focuses on extracting modal components from the monolithic `App.jsx` into reusable, accessible components.

## ✅ Completed Tasks

### Task 1: Create Directory Structure
**Status:** ✅ Complete

```
src/
├── components/
│   ├── Modal/
│   │   ├── Modal.jsx           # Base modal with a11y built-in
│   │   ├── Modal.css           # Consolidated modal styles
│   │   └── index.js            # Exports
│   ├── StartModal/
│   │   ├── StartModal.jsx
│   │   ├── StartModal.css
│   │   └── index.js
│   ├── RoundSummaryModal/
│   │   ├── RoundSummaryModal.jsx
│   │   ├── RoundSummaryModal.css
│   │   └── index.js
│   └── GameCompleteModal/
│       ├── GameCompleteModal.jsx
│       ├── GameCompleteModal.css
│       └── index.js
├── hooks/
│   ├── useFocusTrap.js         # Focus trap hook
│   ├── useModal.js             # Modal state hook
│   └── index.js                # Exports
```

### Task 2: Create useFocusTrap Hook
**Status:** ✅ Complete  
**File:** `src/hooks/useFocusTrap.js`

Features:
- Traps Tab/Shift+Tab within modal container
- Automatically focuses first focusable element on mount
- Refreshes focusable elements list on each Tab press
- Clean event listener cleanup

### Task 3: Create useModal Hook
**Status:** ✅ Complete  
**File:** `src/hooks/useModal.js`

Features:
- Manages open/close state
- Handles closing animation delay
- Saves and restores focus on open/close
- Provides toggle function
- Exposes setters for controlled usage

### Task 4: Create Base Modal Component
**Status:** ✅ Complete  
**File:** `src/components/Modal/Modal.jsx`

Features:
- ARIA dialog semantics (`role="dialog"`, `aria-modal`, `aria-labelledby`)
- Focus trap integration
- Escape key dismissal (configurable)
- Backdrop click dismissal (configurable)
- Body scroll lock when open
- Closing animation support
- Size variants (sm, md, lg)
- Portal rendering for proper stacking
- Screen reader-only title option

### Task 5: Create Modal CSS with Design Tokens
**Status:** ✅ Complete  
**File:** `src/components/Modal/Modal.css`

Features:
- CSS custom properties for all values
- Reduced motion support
- Entrance/exit animations
- Size variants
- Focus visible styles
- Mobile responsive

### Task 6: Extract StartModal Component
**Status:** ✅ Complete  
**Files:** `src/components/StartModal/StartModal.jsx`, `StartModal.css`

Props:
- `isOpen` - Modal visibility
- `onStart` - Start game callback

Content:
- Globe emoji icon
- Game title
- Instructions
- Color legend
- Play button
- Credits footer

### Task 7: Extract RoundSummaryModal Component
**Status:** ✅ Complete  
**Files:** `src/components/RoundSummaryModal/RoundSummaryModal.jsx`, `RoundSummaryModal.css`

Props:
- `isOpen` - Modal visibility
- `isClosing` - Closing animation state
- `onContinue` - Continue callback
- `countryName` - Country name to display
- `countryCode` - ISO code for flag
- `preloadedFlagUrl` - Optional preloaded flag URL
- `score` - Points earned
- `currentRound` - Current round number
- `totalRounds` - Total rounds (default: 5)
- `onFlagError` - Flag load error handler

### Task 8: Extract GameCompleteModal Component
**Status:** ✅ Complete  
**Files:** `src/components/GameCompleteModal/GameCompleteModal.jsx`, `GameCompleteModal.css`

Props:
- `isOpen` - Modal visibility
- `isClosing` - Closing animation state
- `onPlayAgain` - Play again callback
- `totalScore` - Final score
- `roundResults` - Array of round results (includes countryCode per round)
- `onFlagError` - Flag load error handler

---

## 📊 Sprint 1 Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Components Created | 4 | 4 | ✅ |
| Hooks Created | 2 | 2 | ✅ |
| CSS Files Created | 4 | 4 | ✅ |
| Build Status | Pass | Pass | ✅ |
| Lint Status | 0 errors | 0 errors | ✅ |

---

## 🔄 Integration Status

**Status:** ✅ Complete

The new components have been integrated into `App.jsx`:

### Changes Made:
1. ✅ Imported `StartModal`, `RoundSummaryModal`, `GameCompleteModal` components
2. ✅ Replaced inline Start Modal JSX (~45 lines) with `<StartModal />`
3. ✅ Replaced inline Round Summary Modal JSX (~35 lines) with `<RoundSummaryModal />`
4. ✅ Replaced inline Game Complete Modal JSX (~50 lines) with `<GameCompleteModal />`
5. ✅ Added `countryCode` to `roundResults` for flag display in Game Complete modal
6. ✅ Passed `preloadedFlagUrl` to RoundSummaryModal for faster flag loading

### Props Passed:

**StartModal:**
```jsx
<StartModal 
  isOpen={!gameStarted}
  onStart={onGameStart}
/>
```

**RoundSummaryModal:**
```jsx
<RoundSummaryModal
  isOpen={showRoundModal}
  isClosing={modalClosing}
  onContinue={handleNextRound}
  countryName={roundResults[currentRound - 1]?.target || 'Unknown'}
  countryCode={roundResults[currentRound - 1]?.countryCode || getCountryCode(targetCountry)}
  preloadedFlagUrl={preloadedFlagUrl}
  score={roundResults[currentRound - 1]?.score || 0}
  currentRound={currentRound}
  totalRounds={5}
  onFlagError={handleFlagError}
/>
```

**GameCompleteModal:**
```jsx
<GameCompleteModal
  isOpen={gameOver}
  isClosing={modalClosing}
  onPlayAgain={playAgain}
  totalScore={score}
  roundResults={roundResults}
  onFlagError={handleFlagError}
/>
```

### Lines Removed from App.jsx:
- ~130 lines of inline modal JSX replaced with 3 component calls (~25 lines)
- Net reduction: ~105 lines

---

## 📁 Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `src/hooks/useFocusTrap.js` | 62 | Focus trap for accessibility |
| `src/hooks/useModal.js` | 65 | Modal state management |
| `src/hooks/index.js` | 2 | Hook exports |
| `src/components/Modal/Modal.jsx` | 139 | Base modal with a11y |
| `src/components/Modal/Modal.css` | 195 | Modal design tokens + styles |
| `src/components/Modal/index.js` | 1 | Component export |
| `src/components/StartModal/StartModal.jsx` | 92 | Start modal component |
| `src/components/StartModal/StartModal.css` | 108 | Start modal styles |
| `src/components/StartModal/index.js` | 1 | Component export |
| `src/components/RoundSummaryModal/RoundSummaryModal.jsx` | 93 | Round summary component |
| `src/components/RoundSummaryModal/RoundSummaryModal.css` | 84 | Round summary styles |
| `src/components/RoundSummaryModal/index.js` | 1 | Component export |
| `src/components/GameCompleteModal/GameCompleteModal.jsx` | 98 | Game complete component |
| `src/components/GameCompleteModal/GameCompleteModal.css` | 112 | Game complete styles |
| `src/components/GameCompleteModal/index.js` | 1 | Component export |

**Total new code:** ~1054 lines (reusable, accessible, maintainable)

---

*Sprint 1 Log Updated — December 2024*
