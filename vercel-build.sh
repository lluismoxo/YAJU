#!/usr/bin/env bash
# Prueba de diagnostico Vercel: raiz + CSS de _next (sin media ni JS).
set -e
rm -rf public
mkdir -p public/_next/static/immutable/chunks
cp _next/static/immutable/chunks/*.css public/_next/static/immutable/chunks/
for f in *; do
  [ -f "$f" ] && [ "$f" != vercel.json ] && [ "$f" != vercel-build.sh ] && cp "$f" public/
done
echo "PRUEBA RAIZ+CSS: $(find public -type f | wc -l) files, $(du -sh public | cut -f1)"
