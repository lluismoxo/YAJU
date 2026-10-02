import { site } from '../../config/site.mjs';

// These compatibility routes deliberately retain the existing HTML and behavior.
// HTTP redirects can replace them in a later, separately verified routing stage.
export function renderRedirect({ destination, notice = 'moved' }) {
  if (typeof destination !== 'string' || !/^\/[a-z0-9/-]*$/.test(destination) || destination.startsWith('//')) {
    throw new Error('Redirect destination must be a local route without markup');
  }
  if (!['moved', 'events'].includes(notice)) throw new Error(`Unknown redirect notice: ${notice}`);
  const message = notice === 'events'
    ? `There are no public events scheduled right now. Company news is in the <a href="${destination}">newsroom</a>.`
    : `This page has moved to <a href="${destination}">${destination}</a>.`;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
<title>Moved</title>
<link rel="canonical" href="${site.origin}${destination}"/>
<meta http-equiv="refresh" content="0; url=${destination}"/>
<meta name="robots" content="noindex"/>
<style>body{font-family:system-ui,sans-serif;margin:3rem auto;max-width:34rem;padding:0 1rem;color:#1a1a1a}
a{color:#1a1a1a}</style>
</head><body>
<p>${message}</p>
<script>location.replace("${destination}");</script>
<script src="/assets/${site.compatibilityScript}" defer=""></script></body></html>
`;
}
