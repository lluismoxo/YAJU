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
  | xargs -0 perl -pi -e 's#site-updates-2026-09-29\.js(?:\?v=[^"'"'"']*)?#site-updates-2026-09-29.js?v=2026-09-30-3#g'
# Add visual overrides inside the existing CSS bundles so React receives untouched HTML.
for css_file in public/_yaju/static/immutable/chunks/*.css; do
  cat public/assets/yaju-hydration-safe.css >> "$css_file"
done
echo "BUILD: $(find public -type f | wc -l) files, $(du -sh public | cut -f1), refs _next restantes: $(grep -rl '/_next/' public | wc -l)"
