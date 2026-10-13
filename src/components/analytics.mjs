import { readFileSync } from 'node:fs';
import { site } from '../../config/site.mjs';
const script = readFileSync(new URL('../client/consent.js', import.meta.url), 'utf8').replaceAll('__ANALYTICS_ID__', site.analyticsId);
const styles = readFileSync(new URL('../client/consent.css', import.meta.url), 'utf8');
// Basic consent mode: only this first-party controller runs before opt-in.
export function renderAnalytics() {
  return `<style id="yaju-consent-styles">${styles}</style><script id="yaju-consent-controller">${script}</script>`;
}
