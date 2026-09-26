#!/usr/bin/env bash
# Prueba de diagnostico Vercel: solo los archivos sueltos de la raiz.
set -e
rm -rf public
mkdir -p public
for f in *; do
  [ -f "$f" ] && [ "$f" != vercel.json ] && [ "$f" != vercel-build.sh ] && cp "$f" public/
done
echo "PRUEBA SOLO RAIZ: $(find public -type f | wc -l) files, $(du -sh public | cut -f1)"
