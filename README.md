# YAJU website

Sitio estático nativo con el diseño, CSS y medios de la web original. Requiere
Node.js 22+ y las dependencias fijadas en `package-lock.json`.

```sh
npm ci
npm run verify
```

La salida publicable es `public/`. `npm run build` y Vercel generan las páginas
nativas por defecto. El constructor publica únicamente entradas explícitas; no
copia indiscriminadamente el repositorio ni incluye el backend de `supabase/`.

- `src/content/pages/`: contenido, metadatos y estados de las 137 páginas.
- `src/components/`: plantillas y fragmentos compartidos; Legal tiene datos propios.
- `src/client/`: interacciones nativas, cargadas según cada ruta.
- `static/`: imágenes, fuentes, CSS y medios conservados.
- `config/native-pages.json`: rutas nativas; `config/site-inputs.json`: inventario de recursos y redirecciones.
- `src/pages/` y `legacy/runtime/`: material de referencia para comprobar o recuperar
  la versión anterior. El runtime descargado y el parche DOM no se publican.

`npm run verify` comprueba la salida nativa, sus enlaces, analítica, aislamiento,
recursos y las huellas de los medios compartidos. `npm run verify:legacy` reconstruye
la referencia anterior en `artifacts/legacy-reference` y verifica sus huellas, sin
sustituir la salida publicable. `node scripts/build.mjs --native-all` genera una
copia independiente en `artifacts/native-all` para comparaciones visuales.

Estado y controles de aceptación: [plan de migración](docs/ARCHITECTURE-MIGRATION.md).
Los informes visuales documentan también diferencias de rasterización y límites
de cada prueba; no equivalen a prometer igualdad de cada píxel en cualquier navegador.
No editar los archivos generados de `public/`. Vercel instala con `npm ci --include=dev`
y ejecuta `vercel-build.sh`; el proyecto sigue usando `public` como salida.
