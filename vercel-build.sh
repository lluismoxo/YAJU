#!/usr/bin/env bash
# Build para Vercel: copia la web a public/ y renombra /_next/ a /_yaju/,
# porque Vercel no publica la ruta /_next/ en proyectos que no son Next.js.
set -e
rm -rf public
mkdir public
for f in *; do
  [ "$f" != public ] && [ "$f" != vercel.json ] && [ "$f" != vercel-build.sh ] && cp -R "$f" public/
done
mv public/_next public/_yaju
find public -type f \( -name '*.html' -o -name '*.js' -o -name '*.css' -o -name '*.json' -o -name '*.webmanifest' \) -print0 \
  | xargs -0 perl -pi -e 's#/_next/#/_yaju/#g'
# Bust the browser cache for the shared page-fix script on every dated release.
find public -type f -name '*.html' -print0 \
  | xargs -0 perl -pi -e 's#site-updates-2026-09-29\.js(?:\?v=[^"'"'"']*)?#site-updates-2026-09-29.js?v=2026-09-30-2#g'
# Make the Academy header and Scholars image layout correct before JavaScript hydrates.
perl -0pi -e 's~</head>~<style id="yaju-agent-academy-header-base">nav.hidden.lg\\:block{color:#000!important}nav.hidden.lg\\:block>div.bg-neutral-15{background:#fff!important}nav.hidden.lg\\:block a[href="/register"]{color:#212121!important}nav.hidden.lg\\:block a[href="/contact-sales"]{background:#17171c!important;color:#fff!important}nav.lg\\:hidden{background:#fff!important;color:#000!important}</style></head>~' public/agent-academy/index.html
perl -pi -e 's#/logo_dark\.svg#/logo.svg#g; s#/nav_icon_dark\.svg#/nav_icon.svg#g' public/agent-academy/index.html
perl -0pi -e 's~</head>~<style id="yaju-scholars-about-layout">img[src*="yaju-scholars-about-1781x1188"]{border-radius:24px!important}div:has(>img[src*="yaju-scholars-about-1781x1188"]){border-radius:24px!important;overflow:hidden!important;flex:1.6 1 0%!important;box-shadow:inset 0 0 0 1px rgba(23,23,28,.08)!important}div:has(>img[src*="yaju-scholars-about-1781x1188"])+div{flex:.7 1 0%!important}</style></head>~' public/labs/scholars/index.html
echo "BUILD: $(find public -type f | wc -l) files, $(du -sh public | cut -f1), refs _next restantes: $(grep -rl '/_next/' public | wc -l)"
