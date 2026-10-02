# Migración de YAJU con igualdad visual

Referencia inicial: commit `a1c700f`. Rama de trabajo: `codex/architecture-parity`.

## Regla de aceptación

El frontend actual es la referencia: imágenes, fuentes, textos, dimensiones, recortes,
radios, colores, espaciado, orden, responsive, navegación y animaciones. No se acepta
un cambio de aspecto para simplificar la implementación. Una ruta con diferencias
pendientes conserva su implementación anterior.

La igualdad se evalúa con el mismo navegador, versión, viewport, fuentes, estado de
consentimiento y momento de animación. Las capturas con animaciones inmovilizadas
comprueban geometría; las interacciones y animaciones se verifican adicionalmente.
No se actualizan las referencias para ocultar diferencias.

## Plan y puertas de paso

1. **Referencia y constructor determinista.** Inventario de todos los archivos,
   separación de código público/privado, salida idéntica por SHA-256. Completado.
   Los cinco archivos de backend previamente copiados al sitio se excluyen.
2. **Referencias visuales e interacciones.** Capturas desktop (1440×900), tablet
   (768×1024) y móvil (390×844), portada y página completa. Menús abiertos/cerrados,
   scroll, acordeones, filtros de Blog, formularios y consentimiento. Conservar
   errores existentes por separado de las regresiones. Primera muestra completada:
   portada, Scholars y Academy; 9 combinaciones de ruta/resolución y 21 estados
   comparados con cero píxeles diferentes. Resto de rutas/estados pendiente.
3. **Piloto con código fuente nativo.** Elegir una página representativa; extraer
   contenido y construir componentes conservando DOM/CSS visual. Reemplazar su
   comportamiento compilado sólo tras comprobar todos sus estados. Piloto de Legal implementado en salida separada; validación adicional pendiente antes de activarlo por defecto. Primer piloto simple completado: 48 redirecciones convertidas en
   datos y una plantilla compartida, con salida binaria idéntica.
4. **Componentes compartidos.** Header/footer, tarjetas, medios y acordeones.
   Migrar en grupos pequeños; comparación con la referencia para cada ruta.
   Pendiente.
5. **Migración completa.** Todas las rutas con sus metadatos y contenido propio;
   eliminar exportación/RSC heredados y parches del navegador sólo cuando ya no
   tengan consumidores. Pendiente.
6. **Validación y publicación.** Cero regresiones de aspecto/interacciones,
   pruebas de formularios sin envíos reales, enlaces y recursos válidos,
   comparación de rendimiento y vista previa. Publicar cambios gradualmente con
   posibilidad de restaurar la versión anterior. Pendiente.

## Estructura de la primera etapa

- `src/pages/`: 145 HTML heredados (incluidos 7 fragmentos) y 48 redirecciones
  declarativas JSON. Los documentos visuales siguen siendo una capa temporal.
- `src/components/`: primera plantilla propia reutilizable para redirecciones.
- `static/`: imágenes, fuentes, iconos y recursos del navegador, incluido el
  script de compatibilidad que sigue siendo necesario.
- `legacy/runtime/`: runtime compilado anterior, aislado hasta su sustitución.
- `supabase/`: backend existente; nunca se copia a la carpeta pública.
- `config/`: configuración y lista explícita de entradas públicas.
- `scripts/`: constructor y comprobación de igualdad de la salida.
- `tests/`: pruebas de estructura, recursos y huellas de producción.
- `public/`: artefacto generado e ignorado por Git; no editar.

No se ha eliminado React compilado ni el MutationObserver de compatibilidad en
esta etapa. No se atribuyen mejoras de velocidad o SEO a una salida idéntica.
El beneficio inmediato es reproducibilidad, aislamiento y una barrera automática
contra cambios involuntarios.

## Comandos

- `npm run build`: construir usando únicamente las entradas autorizadas.
- `npm test`: comprobar inventario, enlaces/recursos, analítica y exclusión privada.
- `npm run check:parity`: exigir igualdad binaria de los 1.202 archivos web.
- `npm run verify`: ejecutar las tres comprobaciones.

El constructor sólo sustituye `public/` después de completar todos los archivos.
Los cambios futuros de componentes necesitarán una nueva puerta de comparación
visual por ruta; no se debe retirar la prueba de igualdad sin esa sustitución.

## Evidencia de la primera etapa

- 1.202/1.202 archivos del navegador idénticos al commit de referencia.
- Cinco pruebas automatizadas superadas, incluido rechazo de entradas inválidas
  sin perder el último build correcto.
- 48 redirecciones generadas por una única plantilla, con HTML idéntico.
- 21 capturas de estados comparadas, cero píxeles diferentes. El informe está en
  `docs/phase-1-visual-report.json`; capturas locales en `artifacts/visual-parity/`.
- Las pruebas registran errores React/parentNode presentes también en la
  referencia. No se han resuelto todavía; no se afirma que el runtime esté limpio.
  También se registran imágenes sin dimensiones naturales, incluidas variantes
  responsive fuera del viewport; no se atribuyen automáticamente a regresiones.
- Comparación en Chrome instalado, con animaciones CSS detenidas. Los medios
  externos se leen una vez y se comparten entre ambas versiones para evitar
  diferencias de red. No se envían formularios ni eventos de analítica.
- Estas capturas son una muestra inicial; no validan todas las páginas, el
  movimiento de las animaciones ni todos los estados interactivos.

## Reproducir la referencia y las capturas

`npm run reference:freeze` reconstruye el commit original en una carpeta aislada
`artifacts/reference-a1c700f/public`. Nunca genera la referencia a partir de la
rama migrada. El comparador valida sus huellas antes de capturar.

La prueba visual requiere Chrome y los paquetes de desarrollo Playwright y PNGJS
(versiones utilizadas: 1.62.1 y 7.0.0). Se pueden suministrar mediante
`YAJU_BROWSER_MODULES`, indicando la carpeta node_modules del entorno de pruebas.
No son dependencias del sitio publicado.

```sh
npm run check:visual -- artifacts/reference-a1c700f/public
```

La migración de páginas visuales a componentes propios y la retirada del runtime
heredado siguen pendientes. Esta etapa no se publica automáticamente en main.


## Piloto nativo de Legal (segunda etapa)

`npm run build:pilot` usa el mismo constructor y genera `artifacts/native-pilot`.
Sólo sustituye `/legal` y añade `assets/native-navigation.js`. `npm run check:pilot`
exige que los otros 1.201 archivos conserven sus huellas originales y no aparezcan
archivos adicionales inesperados. El build normal y producción siguen intactos.

- Contenido de Legal separado en JSON; renderer propio; header y footer compartidos.
- Navegación propia sin hidratación React, RSC ni script de modificaciones posteriores.
- 41 estados con movimiento reducido y 41 estados finales con animaciones activadas,
  todos con cero píxeles diferentes en las últimas ejecuciones. Los informes son
  `phase-2-legal-visual-report.json` y `phase-2-legal-motion-report.json`.
- En una ejecución anterior apareció una diferencia transitoria sólo en la imagen
  de fondo del footer; no se cambió la tolerancia ni la referencia. Las dos siguientes
  comparaciones completas pasaron. Se guardan diagnósticos si vuelve a suceder.
- Las capturas de estados finales no demuestran igualdad de cada frame animado.
- Cero excepciones JavaScript en el piloto durante estas pruebas; la referencia
  registra el error React 418. Siete pruebas automatizadas pasan.
- Se conserva la configuración de analítica y consentimiento del sitio; las pruebas
  bloquean terceros y no verifican la recogida real de eventos ni el banner remoto.

Antes de activar este piloto: ampliar comprobación de teclado, consentimiento real
sin envíos, animaciones durante la transición y capturas completas. Después migrar
otra familia de páginas, manteniendo pruebas y la versión anterior disponible.


### Vista previa y comprobaciones de teclado

La vista previa del piloto se sirve sólo en `127.0.0.1:4180`, desde
`artifacts/native-pilot`; no cambia el despliegue público. Para reiniciarla:

```sh
npm run build:pilot
python3 -m http.server 4180 --bind 127.0.0.1 --directory artifacts/native-pilot
```

`npm run check:interactions` comprueba el salto al contenido por teclado, apertura
por teclado, Escape, entrada del foco en enlaces del desplegable, navegación móvil
con retorno y restauración del scroll, respuesta 200 de los nueve destinos legales,
ausencia de excepciones JavaScript y disponibilidad del contenido sin JavaScript.
El informe está en `phase-2-legal-interactions.json`. Se corrigió el cierre prematuro
del desplegable al mover el foco desde su etiqueta a sus enlaces.

Pendientes: consentimiento de terceros, paridad durante cada transición y migración
de las demás páginas. El usuario solicita revisar un enlace local antes de publicar.

Última comprobación (2026-10-02): 39/41 estados coinciden; hay diferencias en
scroll de tablet y menú raíz móvil. El informe `phase-2-legal-latest-report.json`
es la evidencia más reciente y prevalece sobre los informes anteriores aprobados.
La espera de dos capturas estables no ha resuelto todas las diferencias. El piloto
sigue pendiente de aceptación visual y no debe publicarse todavía.
