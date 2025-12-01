# 🦻 Screen Reader Testing Guide

**GeoRadio Modal System — Accessibility Testing Documentation**

This guide documents expected screen reader behavior for all modal components and provides testing checklists for NVDA, VoiceOver, and JAWS.

---

## 📋 Testing Environment Setup

### NVDA (Windows)
1. Download from https://www.nvaccess.org/download/
2. Press `Insert + N` to open NVDA menu
3. Use `Ctrl` to stop speech
4. Use `Insert + Space` to toggle focus mode

### VoiceOver (macOS)
1. Press `Cmd + F5` to enable
2. Use `VO + Arrow keys` to navigate (VO = Ctrl + Option)
3. Use `VO + Space` to activate
4. Press `Cmd + F5` again to disable

### VoiceOver (iOS)
1. Settings → Accessibility → VoiceOver
2. Triple-tap Home button (or Side button) for quick toggle
3. Swipe left/right to navigate
4. Double-tap to activate

### TalkBack (Android)
1. Settings → Accessibility → TalkBack
2. Swipe left/right to navigate
3. Double-tap to activate

---

## 🎯 Modal Component Testing

### 1. Base Modal (`Modal.jsx`)

#### Expected Screen Reader Announcements

| Event | Expected Announcement |
|-------|----------------------|
| Modal opens | "[Title] dialog" followed by first focusable element |
| Focus trap active | Tab cycles through modal elements only |
| Escape pressed | Modal closes, focus returns to trigger |

#### ARIA Implementation

```html
<div role="dialog" aria-modal="true" aria-labelledby="modal-title-id">
  <h2 id="modal-title-id">Dialog Title</h2>
  <!-- content -->
</div>
```

#### Test Checklist

- [ ] Modal is announced as a dialog when opened
- [ ] Dialog title is read immediately
- [ ] Tab key only cycles through elements inside modal
- [ ] Shift+Tab cycles backwards
- [ ] Escape key closes the modal (where applicable)
- [ ] Focus returns to the element that triggered the modal
- [ ] Background content is not reachable via Tab

---

### 2. Start Modal (`StartModal.jsx`)

#### Expected Announcements

| Element | NVDA | VoiceOver |
|---------|------|-----------|
| Modal opens | "Welcome to GeoRadio dialog" | "Welcome to GeoRadio, dialog" |
| Instructions | "Listen to a radio station and guess which country it's from" | Same |
| Legend items | "Very close! Getting warmer Cold" | Same |
| Play button | "Play button" | "Play, button" |

#### Test Checklist

- [ ] Dialog title "Welcome to GeoRadio" is announced
- [ ] Instructions are readable
- [ ] Legend items (Very close, Getting warmer, Cold) are announced
- [ ] "Play" button is clearly labeled
- [ ] Pressing Enter on Play button starts the game
- [ ] No escape key handler (intentional - game must start via button)

---

### 3. Round Summary Modal (`RoundSummaryModal.jsx`)

#### Expected Announcements

| Element | Announcement |
|---------|--------------|
| Modal opens | "Round [N] Complete - [Country] dialog" |
| Flag image | "Flag of [Country] image" |
| Country name | "[Country] heading level 2" |
| Score | "+[N] points" |
| Continue button | "Continue to next round button" or "See final results button" |

#### Test Checklist

- [ ] Modal announces round number and country name
- [ ] Flag has descriptive alt text
- [ ] Country name is announced as heading
- [ ] Score is announced
- [ ] Button clearly states next action
- [ ] Escape key advances to next round

---

### 4. Game Complete Modal (`GameCompleteModal.jsx`)

#### Expected Announcements

| Element | Announcement |
|---------|--------------|
| Modal opens | "Game Complete - Final Score: [N] points dialog" |
| Score hero | "[N] points" |
| Round summaries | "[Country] +[N]" for each round |
| Flags | "Flag of [Country] image" |
| Play Again button | "Play another game button" |

#### Test Checklist

- [ ] Final score is prominently announced
- [ ] All 5 round results are navigable
- [ ] Each round's flag has alt text
- [ ] "Play Again" button is clearly labeled
- [ ] Escape key triggers Play Again action

---

## 🔧 Focus Management Testing

### Focus Trap Verification

1. Open any modal
2. Press Tab repeatedly
3. **Expected**: Focus cycles through modal elements only
4. Press Shift+Tab
5. **Expected**: Focus cycles backwards through modal elements

### Focus Restoration

1. Note the currently focused element
2. Open a modal
3. Interact with modal and close it
4. **Expected**: Focus returns to the original element

---

## 📱 Mobile Screen Reader Testing

### VoiceOver (iOS)

| Gesture | Action |
|---------|--------|
| Swipe right | Next element |
| Swipe left | Previous element |
| Double-tap | Activate |
| Two-finger tap | Stop speech |
| Swipe up/down | Adjust value (sliders) |

#### Test Checklist

- [ ] Modals announced when appearing
- [ ] All interactive elements reachable
- [ ] Double-tap activates buttons
- [ ] Content order makes sense

### TalkBack (Android)

| Gesture | Action |
|---------|--------|
| Swipe right | Next element |
| Swipe left | Previous element |
| Double-tap | Activate |
| Swipe up then right | Actions menu |

#### Test Checklist

- [ ] Modals announced when appearing
- [ ] Linear navigation works
- [ ] Double-tap activates buttons
- [ ] Explore by touch works on modal content

---

## 🧪 Automated Accessibility Testing

### axe-core Integration

The project includes automated accessibility tests using jest-axe:

```bash
npm run test:run src/components/Modal/Modal.a11y.test.jsx
```

#### Test Coverage

| Test | Description |
|------|-------------|
| Base Modal a11y | No WCAG violations |
| StartModal a11y | Accessible content structure |
| RoundSummaryModal a11y | Flag alt text, button labels |
| GameCompleteModal a11y | Score display, round summaries |

### Running All Accessibility Tests

```bash
npm run test:run -- --grep "a11y"
```

---

## ✅ Pre-Release Checklist

Before each release, complete the following:

### Desktop (NVDA on Windows)
- [ ] Start Modal accessibility
- [ ] Round Summary Modal accessibility
- [ ] Game Complete Modal accessibility
- [ ] Keyboard navigation (Tab, Shift+Tab, Escape)
- [ ] Focus trap functioning
- [ ] Focus restoration working

### Desktop (VoiceOver on macOS)
- [ ] All modals announced correctly
- [ ] Keyboard navigation working
- [ ] Focus management correct

### Mobile (VoiceOver on iOS)
- [ ] All modals accessible
- [ ] Touch gestures working
- [ ] Content order logical

### Mobile (TalkBack on Android)
- [ ] All modals accessible
- [ ] Touch gestures working
- [ ] Content order logical

---

## 📊 Known Issues & Workarounds

### Issue: Modal not announced on dynamic open
**Workaround**: Ensure `aria-modal="true"` is present and focus is moved to modal

### Issue: Focus escapes modal on iOS Safari
**Workaround**: Ensure `body` has `overflow: hidden` when modal is open

### Issue: NVDA not reading live regions
**Workaround**: Use `aria-atomic="true"` with `aria-live="polite"`

---

## 📚 Resources

- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [ARIA Dialog Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialogmodal/)
- [Deque Axe Rules](https://dequeuniversity.com/rules/axe/)
- [NVDA User Guide](https://www.nvaccess.org/files/nvda/documentation/userGuide.html)
- [VoiceOver Getting Started](https://support.apple.com/guide/voiceover/welcome/mac)

---

*Last Updated: December 2024*
