# Cookie consent (2026-10-13)

YA JU's native layout embeds a first-party consent controller. No Google tag, GTM container, or Vercel metrics script is initially downloaded. GA4 G-3T9YSET1R9 and Vercel analytics/performance scripts load only after explicit analytics consent (basic consent mode). Advertising consent remains denied; Google Signals/ad personalisation are disabled.

The necessary localStorage record `yaju.cookie-consent.v1` contains only version, analytics boolean, and timestamp. It expires after 180 days. Malformed, future-dated or expired records fail closed. Blocked storage does not enable analytics. Existing footer Manage Cookies buttons open an accessible native dialog; pages without that footer get a persistent preferences button. Closing without saving does not imply consent.

Withdrawal disables GA, deletes accessible first-party Google analytics cookies at host/parent domains and current path ancestors, and reloads the document to unload GA/Vercel timers and listeners. Cross-tab changes, focus/pageshow and expiry are checked. Previously transmitted data cannot be recalled by browser withdrawal.

Validation: `npm run verify` (15 tests, 137 content pages, unchanged shared design assets); `YAJU_BROWSER_MODULES=... node scripts/check-consent.mjs` (desktop/mobile, fresh visit, reject/reload, footer dialog/Escape, accept, returning visitor, cross-tab withdrawal, cookie deletion, expiry, malformed record, unavailable storage). Tests mock analytics responses. A separate real gtag.js check intercepted collection requests: page_view for the intended ID, 180-day cookies. No local QA collection payloads were sent to Google.

Google account inspection confirmed G-3T9YSET1R9 on the yajuas.com stream. The Google tag already has two destinations named yajuas.com: G-3T9YSET1R9 and G-KPKFG901J5. Both receive events through Google's existing tag configuration; that account configuration was not changed. Consolidation requires an explicit decision about the second property.

Search Console's domain property is accessible and already reports search traffic/indexed pages. A public DNS google-site-verification record exists. The native build now emits robots.txt and a sitemap with canonical indexable routes. Existing noindex directives (78 pages) are preserved, not silently removed. Consent does not control Search Console crawling. Analytics reports depend on opted-in visitors, blockers, and Google's processing time.

References: https://developers.google.com/tag-platform/security/concepts/consent-mode and https://support.google.com/webmasters/answer/9008080
