# Multilingual site

English stays at the existing root URLs (`en-US`). German, French, Spanish,
Japanese and Korean use `/de`, `/fr`, `/es`, `/ja` and `/ko` respectively.
There is no automatic IP/browser-language redirect. The footer links to the
same page in each language and preserves query parameters and fragments.

## Build

`src/i18n/build.mjs` runs after the shared native renderers. Source-offset edits
with parse5 translate text, accessible labels, metadata and embedded interaction
content without reserializing the page or changing classes, IDs and structure.
Acorn locates user-facing strings in the first-party interaction scripts; form
field identifiers and API payload keys stay unchanged. Translation files live
in `locales/*.json`; production requests never call a translation service.
Shared CSS, fonts, images and vendor scripts retain their existing URLs.

All 138 content routes have six static versions (828 pages). Compatibility
redirects also exist under each language prefix. Self canonicals, seven reciprocal
hreflang links and Open Graph locales are generated from one language registry.
Existing noindex directives are retained. The sitemap contains 60 indexable
routes × 6 languages, each with all seven alternate links. x-default points to
the equivalent English page. robots.txt allows all locale paths.

## Updating copy

1. Edit the shared English source/template.
2. Run `node scripts/extract-locales.mjs` to refresh the source catalog.
3. Supply/review corresponding translations in the five locale catalogs.
   `scripts/translate-locales.mjs` is an optional, one-time machine-translation
   helper for public website copy. It is not called during build or at runtime.
4. Run `node scripts/review-locales.mjs` for reviewed common UI/brand overrides.
5. Run `npm run verify`. Missing translations fail the build.

Initial translations were machine-assisted; common UI, consent wording, brand
preservation and sample copy were reviewed. This is not a claim of a complete
professional linguistic review of every long-form article in all five languages.

## Verification

- `npm run verify`: build, unit tests, native resource checks, all locale metadata,
  catalog completeness and multilingual sitemap.
- `scripts/check-i18n-browser.mjs`: six languages × desktop/mobile, footer menu,
  actual language navigation, browser exceptions, analytics blocked initially.
- `scripts/check-i18n-forms.mjs`: all six sales forms, required consent, invalid
  input prevention, simulated rate limit retry and successful response; no real
  contact submission.
- `YAJU_LOCALE=es node scripts/check-consent.mjs`: complete consent lifecycle in a
  translated page, with analytics network responses mocked.
- `YAJU_LOCALES=de,fr,es,ja,ko node scripts/check-native-browser.mjs`: every
  translated content route, missing local resources and runtime exceptions.

Browser checks use `YAJU_BROWSER_MODULES` to locate Playwright and
`YAJU_TEST_ORIGIN` to select a local or preview origin. Visual evidence is saved
under ignored `artifacts/i18n/`.
