# YAJU website

Migración incremental con preservación del frontend actual. Requiere Node.js 22+
para construir; el constructor no necesita dependencias de terceros.

```sh
npm run verify
```

La salida publicable es `public/`. Las páginas están en `src/pages/`, los recursos
públicos en `static/`, el runtime heredado en `legacy/runtime/` y el backend en
`supabase/`. Añadir entradas públicas a `config/site-inputs.json`; el build nunca
copia carpetas completas del repositorio de forma indiscriminada.

Estado y controles de aceptación: [plan de migración](docs/ARCHITECTURE-MIGRATION.md).
La primera etapa conserva el runtime anterior: la migración a componentes nativos
continúa pendiente. No editar los archivos generados de `public/`.
