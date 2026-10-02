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
Legal usa contenido y componentes nativos, incluidos header/footer y navegación.
El resto conserva temporalmente el runtime anterior. El control de huellas exige
1.201 archivos intactos y las dos salidas nativas aprobadas por el usuario. No editar los archivos generados de `public/`.
