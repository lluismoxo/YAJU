(() => {
  'use strict';
  const ID = '__ANALYTICS_ID__';
  const KEY = 'yaju.cookie-consent.v1';
  const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
  let loaded = false, choice = null, banner, panel, toggle, returnFocus;
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  window['ga-disable-' + ID] = true;
  gtag('consent', 'default', {analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',personalization_storage:'denied',security_storage:'granted',functionality_storage:'granted'});
  function readChoice() {
    try {
      const value = JSON.parse(localStorage.getItem(KEY));
      if (value?.version === 1 && typeof value.analytics === 'boolean' && Number.isFinite(value.savedAt) && value.savedAt <= Date.now() && Date.now() - value.savedAt < MAX_AGE) return value;
    } catch { /* Storage may be disabled. Default to no analytics. */ }
    return null;
  }
  function clearAnalyticsCookies() {
    const domains = ['', location.hostname];
    const parts = location.hostname.split('.');
    for (let i = 1; i < parts.length - 1; i++) domains.push(parts.slice(i).join('.'));
    const paths = ['/'];
    const segments = location.pathname.split('/').filter(Boolean);
    for (let i = 1; i <= segments.length; i++) paths.push('/' + segments.slice(0,i).join('/'), '/' + segments.slice(0,i).join('/') + '/');
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.trim().split('=')[0];
      if (!/^(_ga(?:_|$)|_gid$|_gat(?:_|$)|_gac_|_gcl_)/.test(name)) continue;
      for (const domain of domains) for (const path of paths) document.cookie = name + '=; Max-Age=0; Path=' + path + (domain ? '; Domain=' + domain : '') + '; SameSite=Lax';
    }
  }
  function loadAnalytics() {
    if (loaded) return;
    loaded = true;
    window['ga-disable-' + ID] = false;
    gtag('consent', 'update', {analytics_storage:'granted'});
    gtag('js', new Date());
    gtag('set', {allow_google_signals:false, allow_ad_personalization_signals:false, cookie_expires:15552000});
    gtag('config', '__ANALYTICS_ID__');
    const script = document.createElement('script');
    script.id = 'yaju-google-analytics'; script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.append(script);
    for (const src of ['/_vercel/insights/script.js','/_vercel/speed-insights/script.js']) {
      const metric = document.createElement('script'); metric.defer = true; metric.src = src; document.head.append(metric);
    }
  }
  function apply(next) {
    choice = next;
    if (next?.analytics) loadAnalytics();
    else {
      window['ga-disable-' + ID] = true;
      clearAnalyticsCookies();
      // A reload unloads GA and Vercel listeners/timers completely. Do not send a
      // consent-update ping on withdrawal: the next document starts denied.
      if (loaded) { location.reload(); return; }
    }
    if (banner) banner.hidden = Boolean(choice);
  }
  function save(analytics) {
    const next = {version:1,analytics,savedAt:Date.now()};
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* Honour the choice for this document even without storage. */ }
    panel.close();
    apply(next);
  }
  function open() {
    returnFocus = document.activeElement;
    toggle.checked = Boolean(choice?.analytics);
    if (!panel.open) panel.showModal();
  }
  function init() {
    const root = document.createElement('div'); root.id = 'yaju-consent';
    root.innerHTML = `<section id="yaju-cookie-banner" aria-label="Cookie preferences" hidden>
      <div><h2>Your privacy, your choice.</h2><p>We use necessary storage to keep this website working. With your permission, Google Analytics and Vercel metrics help us understand visits and improve the experience.</p><p><a href="/privacy">Privacy Policy</a> · <a href="/cookies">Cookie Policy</a></p></div>
      <div class="yc-actions"><button type="button" data-choice="accept">Accept Cookies</button><button type="button" data-choice="reject">Reject / Decline</button><button type="button" data-manage>Manage Cookies</button></div>
    </section>
    <dialog id="yaju-cookie-panel" aria-labelledby="yc-title" aria-describedby="yc-description">
      <div class="yc-heading"><h2 id="yc-title">Cookie preferences</h2><button type="button" data-close aria-label="Close cookie preferences">×</button></div>
      <p id="yc-description">Choose how Yaju uses cookies and analytics. You can change or withdraw your consent at any time using Manage Cookies in the footer.</p>
      <div class="yc-category"><h3>Strictly necessary <span>Always active</span></h3><p>Storage required for essential features and to remember your privacy choice. Your preference is saved on this browser for up to 180 days.</p></div>
      <div class="yc-category"><label for="yc-analytics"><span>Analytics</span><input id="yc-analytics" type="checkbox"></label><p>Allow Google Analytics (GA4) and Vercel metrics to measure visits and performance. Optional; off until you agree. Google Analytics may store _ga cookies for up to 180 days. Advertising consent remains off.</p></div>
      <p><a href="/privacy">Privacy Policy</a> · <a href="/cookies">Cookie Policy</a> · <a href="/legal">Legal</a></p>
      <div class="yc-actions"><button type="button" data-save>Save preferences</button><button type="button" data-choice="reject">Reject / Decline</button><button type="button" data-choice="accept">Accept Cookies</button></div>
    </dialog>`;
    document.body.append(root);
    banner = root.querySelector('section'); panel = root.querySelector('dialog'); toggle = root.querySelector('input');
    root.addEventListener('click', e => {
      const button = e.target.closest('button'); if (!button) return;
      if (button.dataset.choice) save(button.dataset.choice === 'accept');
      else if (button.hasAttribute('data-save')) save(toggle.checked);
      else if (button.hasAttribute('data-manage')) open();
      else if (button.hasAttribute('data-close')) panel.close();
    });
    panel.addEventListener('close', () => { if (returnFocus?.isConnected) returnFocus.focus({preventScroll:true}); });
    document.querySelectorAll('.cky-banner-element').forEach(button => {button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',panel.id);});
    document.addEventListener('click', e => { if (e.target.closest('.cky-banner-element, [data-manage-cookies]')) {e.preventDefault();open();} });
    // Pages without the standard footer still offer a persistent way to revoke.
    if (!document.querySelector('.cky-banner-element')) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'yc-reopen'; button.textContent = 'Manage Cookies'; button.dataset.manageCookies = ''; root.append(button);
    }
    apply(readChoice());
    window.addEventListener('storage', e => {if (e.key === KEY || e.key === null) apply(readChoice());});
    window.addEventListener('pageshow', () => apply(readChoice()));
    window.addEventListener('focus', () => apply(readChoice()));
    setInterval(() => {if (choice && Date.now() - choice.savedAt >= MAX_AGE) apply(null);}, 60000);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true}); else init();
})();
