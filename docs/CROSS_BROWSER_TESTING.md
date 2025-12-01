# Cross-Browser Testing Guide — GeoRadio Modal System

This document provides comprehensive cross-browser testing guidelines for the GeoRadio modal system to ensure consistent behavior across all major browsers.

---

## 🎯 Testing Scope

### Components to Test
- **Base Modal** (`src/components/Modal/Modal.jsx`)
- **StartModal** (`src/components/StartModal/StartModal.jsx`)
- **RoundSummaryModal** (`src/components/RoundSummaryModal/RoundSummaryModal.jsx`)
- **GameCompleteModal** (`src/components/GameCompleteModal/GameCompleteModal.jsx`)

### Key Features to Verify
1. Modal rendering and positioning
2. Animations (entrance/exit)
3. Focus management and trapping
4. Escape key dismissal
5. Backdrop click behavior
6. CSS backdrop-filter (blur effect)
7. Mobile responsiveness
8. Touch interactions

---

## 🌐 Target Browsers

### Desktop Browsers

| Browser | Minimum Version | Engine | Market Share |
|---------|-----------------|--------|--------------|
| **Chrome** | 90+ | Blink | ~65% |
| **Firefox** | 90+ | Gecko | ~7% |
| **Safari** | 15+ | WebKit | ~19% |
| **Edge** | 90+ | Blink | ~5% |

### Mobile Browsers

| Browser | Platform | Minimum Version |
|---------|----------|-----------------|
| **Safari** | iOS | 15+ |
| **Chrome** | Android | 90+ |
| **Samsung Internet** | Android | 15+ |
| **Firefox** | Android | 90+ |

---

## 🔧 Testing Environment Setup

### Local Testing

1. **Install browsers:**
   - Chrome: https://www.google.com/chrome/
   - Firefox: https://www.mozilla.org/firefox/
   - Safari: Built-in on macOS
   - Edge: https://www.microsoft.com/edge

2. **Start development server:**
   ```bash
   npm run dev
   ```

3. **Open in each browser:**
   ```
   http://localhost:5173
   ```

### BrowserStack / Sauce Labs (Cloud Testing)

For comprehensive cross-browser testing, use cloud testing platforms:

```bash
# Example BrowserStack configuration
# Add to package.json scripts for CI/CD integration
"test:browserstack": "browserstack-cypress run"
```

### Playwright Setup (Automated Cross-Browser)

For automated cross-browser testing, install Playwright:

```bash
npm install -D @playwright/test
npx playwright install
```

Create `playwright.config.js`:
```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30 * 1000,
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],
});
```

---

## 📋 Test Checklists

### Modal Rendering & Layout

| Test | Chrome | Firefox | Safari | Edge | iOS | Android |
|------|--------|---------|--------|------|-----|---------|
| Modal centers correctly on screen | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Backdrop covers full viewport | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Content doesn't overflow container | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Border radius renders correctly | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Box shadow displays properly | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Z-index stacking is correct | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

### Animations

| Test | Chrome | Firefox | Safari | Edge | iOS | Android |
|------|--------|---------|--------|------|-----|---------|
| Modal entrance animation plays | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Modal exit animation plays | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Animation timing is consistent | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Reduced motion is respected | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| No animation jank/stutter | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

### Backdrop Blur (CSS backdrop-filter)

| Test | Chrome | Firefox | Safari | Edge | iOS | Android |
|------|--------|---------|--------|------|-----|---------|
| Blur effect visible | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Blur doesn't cause performance issues | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Fallback works if blur unsupported | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

**Note:** `backdrop-filter` has varying support. Firefox required enabling in `about:config` until Firefox 103.

### Focus Management

| Test | Chrome | Firefox | Safari | Edge | iOS | Android |
|------|--------|---------|--------|------|-----|---------|
| Focus moves to modal on open | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Tab cycles through focusable elements | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Shift+Tab cycles in reverse | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Focus stays trapped in modal | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Focus returns to trigger on close | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| Focus outline visible on buttons | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

### Keyboard Interactions

| Test | Chrome | Firefox | Safari | Edge | iOS | Android |
|------|--------|---------|--------|------|-----|---------|
| Escape key closes modal | ☐ | ☐ | ☐ | ☐ | N/A | N/A |
| Enter activates buttons | ☐ | ☐ | ☐ | ☐ | N/A | N/A |
| Space activates buttons | ☐ | ☐ | ☐ | ☐ | N/A | N/A |

### Touch Interactions (Mobile)

| Test | iOS Safari | Chrome Android | Samsung | Firefox |
|------|------------|----------------|---------|---------|
| Tap button triggers action | ☐ | ☐ | ☐ | ☐ |
| Modal doesn't scroll page behind | ☐ | ☐ | ☐ | ☐ |
| Modal content scrollable if needed | ☐ | ☐ | ☐ | ☐ |
| No 300ms tap delay | ☐ | ☐ | ☐ | ☐ |
| Touch gestures don't propagate | ☐ | ☐ | ☐ | ☐ |

---

## ⚠️ Known Browser Issues & Workarounds

### Safari (Desktop & iOS)

#### Issue 1: backdrop-filter rendering
**Problem:** `backdrop-filter: blur()` may cause flickering on some Safari versions.

**Workaround:**
```css
.base-modal-overlay {
  /* Force GPU acceleration */
  -webkit-transform: translate3d(0, 0, 0);
  transform: translate3d(0, 0, 0);
}
```

#### Issue 2: Focus outline not visible
**Problem:** Safari has different default focus styles.

**Solution:** Explicitly set `:focus-visible` styles:
```css
.base-modal button:focus-visible,
.base-modal a:focus-visible {
  outline: 2px solid #00d0ff;
  outline-offset: 2px;
}
```

#### Issue 3: iOS virtual keyboard
**Problem:** Modal may not resize correctly when keyboard appears.

**Workaround:**
```css
.base-modal {
  /* Use visual viewport */
  max-height: 100dvh; /* Dynamic viewport height */
}
```

### Firefox

#### Issue 1: Animation performance
**Problem:** Complex CSS animations may be slightly slower than Chromium.

**Solution:** Use `will-change` sparingly:
```css
.base-modal {
  will-change: transform, opacity;
}
```

#### Issue 2: focus-visible polyfill
**Problem:** Older Firefox may not fully support `:focus-visible`.

**Solution:** The modal already includes fallback styles.

### Edge (Chromium)

Generally consistent with Chrome. No specific workarounds needed for the modal system.

### Samsung Internet

#### Issue 1: Older devices
**Problem:** Older Samsung devices may have performance issues with backdrop blur.

**Solution:** Consider disabling blur for lower-end devices:
```css
@media (prefers-reduced-motion: reduce), (max-device-memory: 4) {
  .base-modal-overlay {
    backdrop-filter: none;
    background-color: rgba(0, 0, 0, 0.8);
  }
}
```

---

## 🎨 CSS Feature Support Matrix

| Feature | Chrome | Firefox | Safari | Edge | iOS | Android |
|---------|--------|---------|--------|------|-----|---------|
| `backdrop-filter` | ✅ 76+ | ✅ 103+ | ✅ 9+ | ✅ 17+ | ✅ 9+ | ✅ 76+ |
| `focus-visible` | ✅ 86+ | ✅ 85+ | ✅ 15.4+ | ✅ 86+ | ✅ 15.4+ | ✅ 86+ |
| CSS Grid | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All |
| CSS Variables | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All |
| `dvh` units | ✅ 108+ | ✅ 108+ | ✅ 15.4+ | ✅ 108+ | ✅ 15.4+ | ✅ 108+ |
| `prefers-reduced-motion` | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All | ✅ All |

---

## 📱 Mobile-Specific Tests

### iOS Safari

1. **Test viewport handling:**
   - Open modal → Pull down to refresh → Verify modal stays fixed
   - Rotate device → Verify modal resizes correctly
   - Open keyboard → Verify modal remains accessible

2. **Test safe area insets:**
   ```css
   .base-modal {
     padding-bottom: env(safe-area-inset-bottom, 0);
   }
   ```

### Android Chrome

1. **Test with 3-button navigation:**
   - Verify modal doesn't overlap navigation bar

2. **Test with gesture navigation:**
   - Verify swipe gestures don't interfere with modal

3. **Test split-screen mode:**
   - Open app in split-screen → Verify modal displays correctly

---

## 🔍 DevTools Testing Tips

### Chrome DevTools

1. **Device emulation:**
   - Press F12 → Toggle device toolbar (Ctrl+Shift+M)
   - Test various screen sizes

2. **Performance profiling:**
   - Record animation → Check for dropped frames

3. **Accessibility audit:**
   - Lighthouse → Accessibility → Run audit

### Firefox DevTools

1. **Responsive Design Mode:**
   - F12 → Click responsive icon
   - Test touch events with "Touch Simulation"

2. **Accessibility Inspector:**
   - F12 → Accessibility panel → Check ARIA attributes

### Safari Web Inspector

1. **Responsive Design Mode:**
   - Develop → Enter Responsive Design Mode

2. **Enable on iOS:**
   - Settings → Safari → Advanced → Web Inspector

---

## 📊 Performance Benchmarks

### Target Metrics

| Metric | Target | Notes |
|--------|--------|-------|
| Modal open time | <100ms | From trigger to fully visible |
| Animation FPS | 60fps | No dropped frames |
| Interaction to response | <50ms | Button press to visual feedback |
| Memory (modal open) | <5MB increase | No memory leaks |

### Testing Tools

1. **Chrome DevTools Performance:**
   ```
   F12 → Performance → Record → Open modal → Stop
   ```

2. **Firefox Profiler:**
   ```
   about:profiling → Start recording → Open modal → Capture
   ```

---

## ✅ Pre-Release Checklist

### Desktop Browsers

- [ ] Chrome (latest) — All tests passing
- [ ] Firefox (latest) — All tests passing
- [ ] Safari (latest) — All tests passing
- [ ] Edge (latest) — All tests passing
- [ ] Chrome (90) — Core functionality works
- [ ] Firefox (90) — Core functionality works

### Mobile Browsers

- [ ] iOS Safari (15+) — All tests passing
- [ ] Chrome Android (90+) — All tests passing
- [ ] Samsung Internet (15+) — All tests passing

### Accessibility

- [ ] Keyboard navigation works in all browsers
- [ ] Focus trap works in all browsers
- [ ] Escape key dismissal works (desktop only)
- [ ] Reduced motion respected in all browsers

### Performance

- [ ] No animation jank in any browser
- [ ] Backdrop blur performs well (or gracefully degrades)
- [ ] No memory leaks detected

---

## 🔗 Resources

- [Can I Use - Browser Support Tables](https://caniuse.com/)
- [MDN Browser Compatibility](https://developer.mozilla.org/en-US/docs/MDN/Writing_guidelines/Page_structures/Compatibility_tables)
- [BrowserStack](https://www.browserstack.com/)
- [Sauce Labs](https://saucelabs.com/)
- [Playwright Cross-Browser Testing](https://playwright.dev/docs/browsers)
- [Chromium Bug Tracker](https://bugs.chromium.org/)
- [Firefox Bugzilla](https://bugzilla.mozilla.org/)
- [WebKit Bug Tracker](https://bugs.webkit.org/)

---

## 📝 Test Result Template

Use this template to record cross-browser test results:

```markdown
## Cross-Browser Test Results — [Date]

### Environment
- GeoRadio Version: [commit hash]
- Test Device: [device name]
- OS Version: [version]

### Results

| Browser | Version | Result | Notes |
|---------|---------|--------|-------|
| Chrome | xxx | ✅/❌ | |
| Firefox | xxx | ✅/❌ | |
| Safari | xxx | ✅/❌ | |
| Edge | xxx | ✅/❌ | |
| iOS Safari | xxx | ✅/❌ | |
| Chrome Android | xxx | ✅/❌ | |

### Issues Found
1. [Issue description]
   - Browser: [browser]
   - Steps to reproduce: [steps]
   - Expected: [expected behavior]
   - Actual: [actual behavior]
   - Screenshot: [link]

### Sign-off
- Tested by: [name]
- Date: [date]
```

---

*Cross-Browser Testing Guide — GeoRadio Modal System — December 2024*
