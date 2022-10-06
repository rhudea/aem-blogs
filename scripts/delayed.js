// eslint-disable-next-line import/no-cycle
import { sampleRUM } from './scripts.js';

// Core Web Vitals RUM collection
sampleRUM('cwv');

// add more delayed functionality here

(function gtm(w, d, s, l, i) {
  w[l] = w[l] || [];
  w[l].push({
    'gtm.start': new Date().getTime(),
    event: 'gtm.js',
  });
  const f = d.getElementsByTagName(s)[0];
  const j = d.createElement(s);
  const dl = l !== 'dataLayer' ? `&l=${l}` : '';
  j.async = true;
  j.src = `https://www.googletagmanager.com/gtm.js?id=${i}${dl}`;
  f.parentNode.insertBefore(j, f);
}(window, document, 'script', 'dataLayer', 'GTM-N5DPB4B'));
