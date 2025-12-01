// Check if gtag is available (loaded from index.html)
const isGtagLoaded = () => typeof window.gtag === 'function';

/**
 * Initialize Google Analytics
 * GA4 is already configured in index.html, this enables debug mode in development
 */
export const initGA = () => {
  if (!isGtagLoaded()) {
    console.warn('Google Analytics gtag.js not loaded');
    return;
  }

  const isProd = window.location.hostname !== 'localhost';
  
  if (!isProd) {
    window.gtag('set', { debug_mode: true });
  }
};

/**
 * Log page view - Note: GA4 auto-tracks page views by default
 * This can be used for SPA navigation if needed in the future
 */
export const logPageView = () => {
  // GA4 automatically tracks page views, this is kept for compatibility
  // but is no longer needed for single-page apps with no routing
};

/**
 * Log custom events for game interactions
 * Events tracked:
 * - game/start: When user starts a new game
 * - game/correct_guess: When user guesses correctly
 * - game/next_round: When user moves to next round
 * - game/game_over: When game ends
 * - game/replay: When user plays again
 */
export const logEvent = (category, action, label) => {
  if (!isGtagLoaded()) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label
  });
};
