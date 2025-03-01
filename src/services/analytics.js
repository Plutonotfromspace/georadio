import ReactGA from 'react-ga4';

export const initGA = () => {
  const isProd = window.location.hostname !== 'localhost';
  ReactGA.initialize('G-VGWYCEN088', {
    gaOptions: {
      cookieDomain: isProd ? 'georadio.io' : 'localhost',
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
