const GA_MEASUREMENT_ID = 'G-VGWYCEN088';

// Check if gtag is available (loaded from index.html)
const isGtagLoaded = () => typeof window.gtag === 'function';

export const initGA = () => {
  if (!isGtagLoaded()) {
    console.warn('Google Analytics gtag.js not loaded');
    return;
  }

  const isProd = window.location.hostname !== 'localhost';
  
  // Configure GA4 with appropriate settings
  window.gtag('config', GA_MEASUREMENT_ID, {
    debug_mode: !isProd,
    cookie_domain: isProd ? 'georadio.io' : 'auto',
    anonymize_ip: true
  });
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
