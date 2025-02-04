import ReactGA from 'react-ga4';

export const initGA = () => {
  const isProd = window.location.hostname.includes('github.io');
  ReactGA.initialize('G-VGWYCEN088', {
    gaOptions: {
      cookieDomain: isProd ? 'plutonotfromspace.github.io' : 'localhost',
      cookieFlags: 'SameSite=None;Secure'
    },
    debug: !isProd
  });
};

export const logPageView = () => {
  ReactGA.send({ hitType: "pageview", page: window.location.pathname });
};

export const logEvent = (category, action, label) => {
  ReactGA.event({
    category,
    action,
    label
  });
};
