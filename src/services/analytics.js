const GA_MEASUREMENT_ID = 'G-VGWYCEN088';

// Check if gtag is available (loaded from index.html)
const isGtagLoaded = () => typeof window.gtag === 'function';

export const initGA = () => {
  if (!isGtagLoaded()) {
    console.warn('Google Analytics gtag.js not loaded');
    return;
  }

  // GA is already configured in index.html with send_page_view: false
  // This function is kept for compatibility with existing code
  // Additional runtime configuration can be added here if needed
  const isProd = window.location.hostname !== 'localhost';
  
  if (!isProd) {
    // Enable debug mode only in development
    window.gtag('set', { debug_mode: true });
  }
};

export const logPageView = () => {
  if (!isGtagLoaded()) return;
  
  window.gtag('event', 'page_view', {
    page_path: window.location.pathname,
    page_title: document.title,
    page_location: window.location.href
  });
};

export const logEvent = (category, action, label) => {
  if (!isGtagLoaded()) return;
  
  window.gtag('event', action, {
    event_category: category,
    event_label: label
  });
};
