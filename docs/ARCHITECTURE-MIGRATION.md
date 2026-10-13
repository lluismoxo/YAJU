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


## Publicación autorizada (2026-10-02)

El usuario revisó el enlace local, confirmó que el diseño es igual y pidió publicar.
Se activa Legal nativo en el manifiesto normal. Su HTML heredado queda conservado en
`legacy/pages/legal/index.html` para recuperación, fuera de la salida pública.
Los informes con diferencias no se sobrescriben ni se presentan como aprobados por
la prueba automática: la aceptación de diseño para esta etapa es la revisión explícita
del usuario. Se mantienen pendientes las investigaciones de rasterización/transiciones.

La prueba de huellas conserva intacta la referencia original y sólo admite las dos
salidas exactas aprobadas, declaradas en `native-legal-approved.sha256.json`. Los otros
1.201 archivos deben seguir idénticos. La configuración de analítica no se ha validado
contra eventos reales de terceros. La migración de las otras páginas continúa pendiente.

## Migración general en curso (2026-10-04)

La opción `node scripts/build.mjs --native-all` construye 136 páginas candidatas
con plantillas HTML locales, fragmentos compartidos y controladores propios en
`artifacts/native-all`. Esta salida es experimental: no está activada en producción.
La compilación normal conserva los archivos aprobados; la navegación y el adaptador
de formularios nuevos se seleccionan únicamente con `--native-all`.

Validación realizada hasta ahora:
- 24 páginas con formularios: consentimiento, validación, respuesta simulada 429 y
  reintento satisfactorio. No se enviaron contactos reales.
- Cinco páginas con pestañas: 36 estados entre escritorio y móvil, y teclado.
- 17 páginas con carruseles: 90 estados entre escritorio y móvil, avance y retorno.
- Compilación pública: siete pruebas satisfactorias y huellas coincidentes con la
  versión aprobada (1.201 archivos sin cambios, más Legal y navegación aprobados).

Los informes reproducibles están en `artifacts/native-*-report.json`; los scripts
`check-native-forms.mjs`, `check-native-tabs.mjs` y `check-native-carousels.mjs`
verifican comportamiento, no equivalencia visual. La comparación visual mantiene
su tolerancia de cero píxeles y no se sustituye por estas pruebas funcionales.

Faltan validaciones y migraciones de búsqueda, modales, registro, controles
especiales de vídeo/animación, paginación y ciertos elementos animados. También
faltan las comparaciones visuales completas de las páginas candidatas, incluidas
transiciones, antes de retirar el runtime heredado y activar la migración general.

Comprobaciones adicionales de esta etapa:
- Versions: sus cuatro filtros pasan en escritorio y móvil (8 estados).
- 136 páginas: título presente, analítica una sola vez, recursos locales existentes
  y ausencia de scripts Next/RSC o parches de compatibilidad en su HTML.
- Se recuperaron los metadatos de nueve páginas legales: el original los transmitía
  fuera de `<head>`; ahora se incluyen en la cabecera estática.
- Se corrigió la transformación de los testimonios al entrar en pantalla en tablet.
  Pricing coincide en los cinco estados de escritorio y cuatro de tablet. En móvil,
  tres estados coinciden y el estado siguiente del carrusel difiere en 66 píxeles.
  Esta diferencia sigue pendiente; no se considera aprobado el conjunto visual.
- No se ha publicado esta etapa experimental. La web pública conserva la versión
  aprobada. Persisten los pendientes funcionales y visuales enumerados arriba.

### Registro, medios y controles especiales

- Registro se incorpora a las plantillas nativas: 137 páginas candidatas. Sus siete
  estados visuales comparados (escritorio, tablet y móvil) coinciden exactamente.
  Se mantiene el formulario POST `/register`; no se ha creado ni validado un servicio
  de alta de cuentas. Este comportamiento preexistente requiere revisión independiente.
- La compilación candidata excluye los 157 chunks JavaScript descargados (8.580.898
  bytes de archivos, no una medición de transferencia por visita) y el parche DOM.
  Los CSS y recursos visuales originales se conservan. Producción sigue independiente.
- Auditoría de carga en navegador: 137 páginas sin excepciones JavaScript, respuestas
  locales 404 ni solicitudes a los scripts retirados. Esto no demuestra paridad visual.
- Carruseles numerados de Observability y Financial Services, índice del informe,
  copia de enlaces y compartir: pruebas de escritorio y móvil, 18 estados. Las
  acciones externas se simulan; no se publicaron mensajes ni contactos.
- Corregidas cinco URLs de vídeos que conservaban el origen temporal de la captura,
  y una URL temporal en un formulario. El verificador ahora rechaza orígenes temporales
  e incluye archivos de vídeo entre los recursos comprobados.
- Verificadas las propiedades originales de reproducción: Careers, Get Started y
  Oran arrancan silenciados; Agent Hub y Observability conservan controles manuales.
- Agent Hub pasa las cinco capturas de escritorio y cuatro de tablet. Quedan dos
  diferencias móviles; una es de 66 píxeles en el borde del testimonio.
- El informe mantiene diferencias importantes en su animación vinculada al scroll.
  Sus botones funcionan, pero no debe activarse como reemplazo público hasta portar
  esa animación y pasar la comparación visual. Búsqueda y otras animaciones siguen
  pendientes. El modal de About no se pudo abrir en la referencia, tampoco por
  teclado; no se ha supuesto una biografía ni un comportamiento nuevos.

### Informe: scroll y texto responsive (2026-10-04)

- Portada del informe: pinning mediante CSS sticky y recorrido proporcional al
  viewport, sin el runtime descargado. El texto se recompone en líneas según el
  ancho actual; se conserva el salto explícito del título y el marcado de énfasis.
- Corregido el fondo del índice móvil al quedar fijo: el contenido ya no se
  transparenta debajo. Paginación, índice, copia y compartir pasan nuevamente
  18 estados funcionales, con acciones externas simuladas.
- Comparación móvil con movimiento reducido: seis capturas idénticas, en portada
  y scroll 800, 1700, 2800, 4000 y 5100. Evidencia:
  `phase-3-report-mobile-visual.json`. Escritorio coincide en portada, menú y
  scroll 800; persisten diferencias en escenas profundas y tablet. Las animaciones
  con movimiento normal y el conjunto del sitio todavía no están aprobados.
- Pruebas generales: siete tests pasan y los 1201 archivos de la compilación
  publicada permanecen idénticos, además de los hashes aprobados de Legal/nav.
- Se observaron desapariciones del directorio de salida y copias `native-all 2`,
  etc. Las últimas comparaciones usan copias estables en `/private/tmp`, sin
  modificar la referencia ni borrar las carpetas duplicadas. Preview estable:
  `http://127.0.0.1:4184/`. Esta etapa no se publica todavía.

### Animación del informe aislada y conservación del motor original (2026-10-05)

- Se reutiliza GSAP **3.13.0**, la misma versión identificada en el original,
  como dependencia fijada y con lockfile. Solo se publican sus distribuciones
  minificadas de GSAP, ScrollTrigger y SplitText, servidas localmente y cargadas
  exclusivamente en el informe. [Instalación oficial](https://gsap.com/docs/v3/Installation/).
- `src/client/report.js` contiene la lógica específica. El módulo común deja de
  incluirla. El template se ha limpiado de envoltorios y estilos de animación
  capturados; conserva los textos, medios y clases. No se conserva React ni la
  ejecución del sitio descargado para esta página.
- Se mantienen pinning, scrub, secuencia de palabras, imágenes, cifras y brillo
  de la cuadrícula con sus tiempos y curvas originales. Se descarta la
  aproximación manual utilizada durante la investigación anterior.
- **19 capturas idénticas con movimiento reducido**: escritorio, tablet y móvil,
  portada, menú de escritorio y scroll 800/1700/2800/4000/5100.
  Evidencia: `phase-3-report-responsive-visual.json`.
- Movimiento normal: 13 de 19 capturas idénticas en la primera comparación;
  seis aún difieren. No se declara aprobada la comparación normal completa.
  Evidencia: `phase-3-report-motion-visual.json`.
- Prueba funcional del movimiento: portada visible, imágenes aplazadas, cambio de
  preferencia mientras se lee y cambio entre móvil/escritorio, sin excepciones.
  También se repiten correctamente los 18 estados de controles especiales.
- Los siete tests generales y la paridad de la compilación publicada pasan.
  La migración experimental continúa sin publicarse; siguen pendientes las
  verificaciones generales de páginas, búsqueda y otras animaciones.

### Carruseles y desplegables: revisión incremental (2026-10-05)

- Se conserva el nodo de imagen cuando se pulsa el desplegable que ya está
  seleccionado. Sustituirlo innecesariamente producía diferencias de rasterizado.
  El cambio de selección sigue reemplazando el medio correspondiente.
- Agent Orchestration System: 7 capturas de escritorio y 6 de móvil idénticas
  a la referencia, incluidos sus cuatro desplegables. Tablet mantiene cuatro
  diferencias pendientes: tres en una imagen de la sección anterior y la última
  con 13 px de diferencia de scroll y distinto estado del header.
  Evidencia: `phase-3-aos-accordion-visual.json`.
- Los 17 carruseles pasan sus controles de avance/retroceso y extremos en
  escritorio y móvil, sin errores JS (34 pares ruta/viewport, 90 estados).
  Evidencia: `phase-3-carousel-controls.json`. El verificador acepta ahora
  `YAJU_TEST_ORIGIN` para poder usar una copia estable.
- Pricing y Agent Hub siguen teniendo 66 píxeles diferentes en el borde de
  la segunda tarjeta móvil. Geometría, estilos calculados y filtros SVG coinciden;
  comparar el original consigo mismo arroja cero diferencias. No se considera
  resuelto ni se relaja el umbral de comparación.
- Esta etapa continúa en el candidato local, sin publicación.

### Conservación del scroll y diagnóstico de renderizado (2026-10-05)

- El cambio de selección actualiza los atributos del contenedor y su imagen
  existentes en vez de reemplazar el nodo. Así se conserva el anclaje de scroll;
  desaparecen los 13 px de desplazamiento y la discrepancia del header detectados
  en el último desplegable de Agent Orchestration System en tablet.
- Nuevo `check-native-accordions.mjs`: **327 estados en 24 páginas y tres anchos**
  (72 pares ruta/viewport), sin excepciones. Comprueba apertura, fuente de imagen
  y conservación del nodo. Espera dos frames tras hacer visible cada control para
  dejar que el observador abra el primer elemento antes de interactuar.
  Evidencia: `phase-3-accordion-controls.json`.
- Se añade un diagnóstico opcional a la comparación visual mediante
  `YAJU_TEST_SOFTWARE_RENDERING=1` (Chrome con `--disable-gpu`). No cambia los
  recursos de ninguna página, la referencia, los estilos inyectados ni el umbral
  de cero píxeles. El informe identifica el modo. La configuración predeterminada
  sigue sin ese argumento.
- Con ese modo, Developers coincide en sus 9 estados de escritorio. Agent
  Orchestration System coincide en los 19 estados de sus tres anchos. Engineering
  coincide en 15 de 16; quedan 6 píxeles en el último desplegable móvil.
  Evidencias: `phase-3-developers-software-rendering.json` y
  `phase-3-accordion-software-rendering.json`.
- Se conservan también los resultados con renderizado predeterminado y el control
  original contra original, que presenta diferencias en dos estados móviles.
  Este diagnóstico no equivale a aprobar toda la migración ni todas las animaciones.
- Pasan los siete tests generales, las huellas de producción y la validación de
  las 137 páginas candidatas. No se publica esta etapa.
- Pricing y Agent Hub: sus ocho capturas móviles coinciden con renderizado por
  software, incluida la segunda tarjeta cuyo borde difería en el modo normal.
  Evidencia: `phase-3-carousel-software-rendering.json`. No ha sido necesario
  modificar el diseño ni los filtros de los carruseles.

### Modal de búsqueda nativo (2026-10-08)

- Blog y Newsroom incluyen ahora un template compartido del modal original,
  cargado únicamente cuando hay un disparador de búsqueda. El controlador nativo
  conserva fondo desenfocado, dimensiones, transición de entrada/salida, foco,
  cierre con Escape/fondo/botón y restauración del scroll. Incluye el control para
  borrar consultas y su espacio de reserva dentro del input.
- `check-native-search.mjs` pasa en los seis pares página/viewport y prueba los
  nueve disparadores: vacío sin navegar, teclado, borrado, tres formas de cierre,
  foco/scroll restaurados y consulta recortada/codificada. El destino de envío está
  **simulado**, no se afirma que haya resultados reales.
- La ruta heredada `/{blog|newsroom}/search?q=...` se conserva. No hay una página
  de resultados en el manifiesto actual: el 404 preexistente sigue pendiente.
  No se ha creado un backend ni inventado una plantilla de resultados.
- La comparación visual conserva capturas de pantalla completa y añade regiones
  del modal con su posición y tamaño comprobados. Las seis aperturas coinciden
  exactamente; cuatro de seis estados con consulta también. Newsroom en tablet
  y móvil difiere en 36 píxeles del borde redondeado del input (canales ±1).
  Persisten diferencias fuera del modal en las páginas de fondo. Evidencias:
  `phase-3-search-visual.json`, `phase-3-search-controls.json`.
- El diagnóstico de movimiento normal del informe con renderizado por software
  no resuelve todas sus diferencias (11/19 estados idénticos). Las posiciones y
  transformaciones inspeccionadas coinciden, pero no se da por aprobada toda la
  animación. Evidencia: `phase-3-report-motion-software-rendering.json`.
- Pruebas generales: siete tests, huellas publicadas y 137 páginas candidatas
  verificadas. Preview local restablecida en `http://127.0.0.1:4184/`.
  Esta etapa sigue sin publicarse.

### AI Spend: partículas y plantilla móvil (2026-10-09)

- El efecto de disolución del titular usa un controlador nativo exclusivo de
  AI Spend. Conserva muestreo, máscaras, formas y constantes de movimiento del
  original; libera el bucle al terminar, al redimensionar o al reducir movimiento.
  Los dos primeros dibujos de partículas coinciden exactamente con la referencia
  (dimensiones, posición, máscara y hash de píxeles). Evidencia:
  `phase-3-dissolve-first-paint.json`. El control de ocho estados comprueba entrada,
  salida y cambio de preferencia; no certifica toda la animación aleatoria.
- Se recupera la plantilla móvil original, distinta del escenario de escritorio.
  El render estático elige su visibilidad con el mismo media query original,
  incluida la excepción de tablet horizontal. El importador espera a que termine
  la eliminación de las imágenes YAJU heredadas para no reintroducirlas.
- El header de campaña conserva ahora la regla original de ocultación al bajar
  en pantallas menores de 1024 px y fondo blanco móvil tras 30 px.
- Seis capturas (inicio y scroll 800, tres anchos, movimiento reducido y renderizado
  por software) coinciden sin diferencias. Se comprueban también las dimensiones
  completas, sin recortar las diferencias. Evidencia:
  `phase-3-campaign-responsive-visual.json`.
- Pasan siete tests generales, las huellas de la versión publicada y la validación
  estructural de 137 páginas candidatas. No se publica esta etapa.
- Pendiente en esta campaña: drawer de navegación, colores del header por
  superficie, recorrido de diapositivas, cursor/video y animaciones móviles.
  La coincidencia de estas seis capturas no aprueba esos comportamientos.

### Menú de campaña AI Spend (2026-10-09)

- Migrada la apertura/cierre del drawer original, conservando clases, clip-path,
  secuencia de frames, retrasos y giro del icono durante el cierre. Se mantiene
  visible el header mientras el menú está abierto. Escape, fondo, botón y enlaces
  lo cierran. El contenido cerrado usa `inert`; el teclado permanece en el menú.
- Migrados el selector English y los botones X/LinkedIn, con destinos canónicos
  y título de página. Las pruebas sustituyen `window.open`: no envían ninguna
  publicación ni certifican la respuesta de esas redes.
- Los seis pares viewport/movimiento pasan apertura, tres cierres, selector,
  recorrido de teclado, cierre al seguir un enlace y destinos de compartir.
- Las 15 capturas con movimiento reducido coinciden exactamente, manteniendo
  la comparación de pantalla completa: `phase-3-campaign-menu-visual.json`.
  Con movimiento normal, móvil coincide en sus cinco estados; quedan diferencias
  en escritorio/tablet, sobre todo por el recorrido y animación de fondo pendientes.
  No se ocultan ni se aprueban esas diferencias. Evidencia:
  `phase-3-campaign-menu-motion-visual.json`.
- Pasan los siete tests generales, aislamiento de producción y comprobación de
  137 páginas candidatas. El controlador añadido solo encuentra un header de
  campaña en AI Spend. Sigue pendiente comprobar el consentimiento de terceros
  (`Manage Cookies`); no se cambia su integración ni se simula consentimiento.
- Sin publicación. El siguiente bloque es el recorrido animado de AI Spend y sus
  superficies/cursor/vídeo; quedan también las comprobaciones globales anteriores.

### Recorrido animado de AI Spend (2026-10-09)

- Nuevo controlador `campaign.js`, exclusivo de AI Spend, con GSAP/ScrollTrigger
  3.13.0 ya fijados en el proyecto. Conserva la secuencia original de pinning,
  desplazamientos, pausas, escalas, interpolación de fondos y colores del header.
  Se elimina la dependencia de React para estas operaciones. No carga SplitText.
- Migradas las entradas verticales de móvil y los enlaces al final del recorrido.
  `matchMedia` revierte timelines y estilos al cambiar de layout o preferencia.
  Un ResizeObserver mantiene la escala del escenario original de 1680 × 1080.
- Corregida una dependencia heredada: el zoom del fondo final estaba dentro del
  condicional de una tarjeta eliminada por el antiguo parche tras inicializarse.
  Ahora el fondo conserva su zoom aunque esa tarjeta ya no exista en la plantilla.
- Las posiciones, dimensiones, opacidades y transformaciones de ocho alturas
  (0–9600) coinciden con el original, incluyendo el fondo final. La prueba también
  comprueba la limpieza de pin-spacers, el cambio móvil/escritorio y el header en
  tablet horizontal. La referencia emite su error de hidratación React #418; se
  registra por separado y no se permiten errores en el candidato.
- Comparación visual estricta con renderizado por software: 6/6 estados de
  movimiento reducido idénticos. Movimiento normal: 4/6 capturas iniciales de
  escritorio idénticas (las otras difieren en 36/24 píxeles); 8/12 de móvil/tablet
  idénticas (diferencias de 36/76 píxeles); 4/6 del recorrido tardío de escritorio
  idénticas. Siguen diferencias en los enlaces finales (7008/14253 píxeles).
  No se aprueba toda la paridad visual ni se modifica el umbral o la referencia.
- Evidencias: `phase-3-campaign-timeline-visual.json`,
  `phase-3-campaign-mobile-motion-visual.json`,
  `phase-3-campaign-late-motion-visual.json`,
  `phase-3-campaign-reduced-visual.json` y `phase-3-campaign-timeline-controls.json`.
- Pasan los siete tests generales, huellas de producción y validación de 137
  páginas candidatas. Sin publicación. Pendientes cursor/miniaturas/vídeo de la
  campaña, diferencias visuales indicadas, Labs y verificaciones globales previas.

### Cursores y límites de texto de AI Spend (2026-10-09)

- Migrados el cursor general de campaña y las miniaturas flotantes de los tres
  enlaces finales. Con puntero táctil se muestran las miniaturas estáticas, con
  el mismo marcado y tipografía originales. Las imágenes se reutilizan desde las
  tarjetas iniciales; no se generan recursos ni se cambian destinos.
- La prueba comparativa pasa para ambos tipos de puntero: apariencia/posición del
  cursor, tres imágenes, entrada/salida y modo táctil. Confirma cero activadores de
  vídeo en el DOM vigente de ambas versiones: las tarjetas se habían eliminado.
  No se añade un reproductor para contenido ausente. Evidencia:
  `phase-3-campaign-pointer-controls.json`.
- Se identifica la causa de las diferencias de 36/76 píxeles en comillas: al
  serializar React se unían nodos de texto adyacentes, cambiando su kerning. Los
  importadores conservan esas separaciones mediante comentarios HTML vacíos.
  No se modifica texto, CSS ni tamaño. Se preservan cinco grupos de escritorio y
  cuatro de móvil. Las 12 capturas animadas móvil/tablet ahora son idénticas:
  `phase-3-campaign-text-boundaries-visual.json`.
- Las 16 capturas de escritorio que incluyen hover y recorrido dejan diferencias
  en cinco estados; dos miniaturas completas y sus regiones son idénticas. La
  tercera región difiere en 22 píxeles y su pantalla completa en 2868; pendiente
  de clasificar. Informe: `phase-3-campaign-pointer-visual.json`.
- Un control original contra original reproduce las diferencias de scroll y
  enlaces finales (539, 7008, 14253 píxeles) con el mismo navegador/software.
  Las tres miniaturas del autocontrol coinciden. No se alteran referencia, umbral
  ni capturas para ocultar discrepancias. Informe:
  `phase-3-campaign-reference-self-visual.json`. Además coinciden la geometría de
  cada carácter y los estilos de los tres enlaces finales en scroll 11500:
  `phase-3-campaign-text-geometry.json`.
- La validación de 137 páginas vuelve a pasar tras regenerar la carpeta de build,
  que había perdido archivos en el entorno local. La copia de
  preview en /private/tmp permanece separada. Siete tests generales y huellas
  publicadas correctas. Sin despliegue; continúan las verificaciones pendientes
  de Labs, informe animado, consentimiento y revisión global.

### Separación del filtro ASCII de Labs (2026-10-09)

- Identificado el módulo original 573931: escena globe.gl/Three.js r179 con
  textura terrestre y relieve, convertida en caracteres mediante un segundo
  canvas. El HTML capturado contiene canvases sin su comportamiento; no basta
  con conservar ese marcado para completar la migración.
- Extraído `src/client/globe-ascii.js` con nombres legibles, conservando orden de
  muestreo, luminancia, contraste, fuente, posiciones, aparición y distancias
  de cámara por tamaño de pantalla. Aún no se carga ni publica este módulo:
  falta integrar la escena y comprobar su apariencia y controles completos.
- `tests/globe-ascii.test.mjs` ejecuta directamente el filtro del bundle original
  como referencia independiente. Coinciden todos los caracteres, coordenadas y
  estilos en 72 combinaciones de viewport, canvas y fase de aparición, incluidos
  límites de muestreo. También se verifican siete límites responsive de cámara.
- Esto valida la conversión del filtro, no la paridad visual del globo completo.
  Siguiente paso: separar las dependencias 3D sin React/Next, conectar el ciclo
  de vida con limpieza de RAF/listeners y revisar escritorio/táctil/resize.

### Integración nativa del globo de Labs (2026-10-10)

- `globe.js` conecta el filtro ASCII a globe.gl 2.44.0, three-globe 2.44.0,
  three-render-objects 1.40.0 y Three.js 0.179.1 (r179, como el original).
  Versiones y dependencias transitivas fijadas en package-lock. Esbuild 0.25.9
  genera un bundle independiente, cargado exclusivamente en `/labs`.
- Se conservan cámara, luz, relieve, caracteres, rotación 1.5, damping 0.05,
  zoom deshabilitado y arrastre solo para dispositivos sin pantalla táctil.
  El controlador elimina RAF, temporizador, listeners, controles y renderer al
  salir y monta una única instancia al restaurar la página desde historial.
- Las URLs relativas al protocolo del original se bloqueaban por CORS en HTTP
  local. Las texturas del paquete fijado coinciden byte a byte con el CDN:
  tierra `228deba2e4b600146bdcb6cfa359b8ead6aacc2b1c13550a29cd82824cfa1c01`,
  relieve `839b12da2e4dd346b256cebae72e10c479a102c8980a22084c41275e4b9a0e12`.
  La candidata las sirve desde `/assets/globe/`; la prueba suministra al original
  esos mismos bytes con CORS para no comparar dos globos vacíos.
- `check-native-globe.mjs` revisa visibilidad real, desktop/touch, resize,
  limpieza y restauración. En modo `YAJU_GLOBE_STATIC=1` detiene la rotación
  **solo en ambas instancias de prueba** y exige igualdad exacta de controles,
  cámara y bytes PNG del canvas a 1440 y 390 px de viewport.
- El canvas coincide exactamente en ambos tamaños. Esto no equivale a aprobar
  toda la página: las capturas con el fondo alrededor aún tienen diferencias
  (134786 píxeles en desktop y 77750 en móvil), aunque el dibujo del globo es
  idéntico. Queda revisar la composición/fondo del hero de Labs y la revisión
  visual global. No se relaja el umbral ni se publica esta fase.
- Pasan las nueve pruebas generales, las huellas publicadas y el aislamiento de
  recursos de las 137 páginas candidatas. Bundle 3D aproximado: 1.7 MB sin gzip,
  únicamente en Labs; no se atribuye a esto una mejora de velocidad medida.

### Fondo y misión de Labs (2026-10-11)

- El degradado difería porque el párrafo de misión había sido serializado con
  divs de SplitText dentro de un `p`. El parser HTML cerraba el párrafo antes
  de tiempo, alterando la tipografía y la altura de toda la sección.
- Se restaura el texto semántico limpio. `labs.js` genera las capas de palabras
  y reproduce la animación original solo en Labs, con limpieza y restauración.
  Se conservan las dos capas de opacidad que presenta el original en ejecución.
- Las capturas del globo **incluido el fondo** son ahora idénticas byte a byte
  en escritorio y móvil (cero píxeles diferentes). Evidencia:
  `phase-3-globe-background.json`; el comparador incorpora esa aserción estricta.
- Diez estados de scroll coinciden en geometría del bloque/párrafo y opacidad de
  cada palabra. La opacidad del pequeño eyebrow en el punto intermedio desktop
  continúa registrada aparte: el original varió entre 0.9988 y 0.9982 y el
  candidato dio 0.9977; no se sustituye esta diferencia por una tolerancia.
  Evidencia: `phase-3-labs-mission-controls.json`.
- Nueve pruebas generales y comprobación de 137 rutas aprobadas. Sin publicación;
  aún no se afirma paridad completa del recorrido de Labs ni del sitio entero.

### Apilado de Featured work en Labs (2026-10-11)

- Se limpian los `pin-spacer` y las dimensiones/transformaciones capturadas de
  sus tres tarjetas con `scripts/migration/clean-labs-stack.mjs`, conservando
  contenido, imágenes, colores y clases originales. El grupo queda identificado
  explícitamente y no se modifica el resto de páginas.
- `labs.js` reproduce pinning, escalado y desplazamiento del texto con los mismos
  cálculos y breakpoints originales. También conserva los enlaces de 14 px en
  móvil. Al cambiar de dispositivo o restaurar desde historial se reconstruyen
  los comportamientos a partir de elementos limpios, sin duplicar pin-spacers.
- Pasan 21 estados de geometría/escala (7 puntos × 3 tamaños) y la limpieza móvil
  seguida de reconstrucción desktop. Las capturas de scroll 2200 son idénticas
  píxel a píxel a 1440, 768 y 390 px. Las pruebas comparten los bytes de recursos
  remotos entre original/candidato; no se modifica el umbral ni las imágenes.
- Evidencias: `phase-3-labs-stack-controls.json` y `phase-3-labs-stack-visual.json`.
  El comparador incorpora aserciones estrictas de geometría y píxeles.
- Inventario adicional: el mismo tipo de tarjeta aparece en home, About y
  Agentic Task Ecosystem. Su migración/validación específica sigue pendiente;
  no se extrapola el resultado de Labs a esas rutas. Sigue sin publicarse la
  candidata completa y no se declara acabada la migración global.

### Controlador compartido de tarjetas (2026-10-11)

- Se extrae el apilado de Labs a `src/client/stack.js` y se carga solo en Labs,
  Inicio, About y Agentic Task Ecosystem. Los proveedores de animación se incluyen
  una sola vez; SplitText continúa limitado a Labs y al informe.
- Se eliminan contenedores y medidas capturados de las tres nuevas plantillas.
  Los botones conservan sus variantes originales: enlace mínimo en Labs y botón
  sólido con icono opcional en Inicio/Ecosystem, también al cambiar de tamaño.
- About conserva 586 px de altura en tableta. El original mantenía esa medida
  después de retirar las imágenes laterales; eliminarla comprimía las tarjetas.
- Inicio recupera los dos fondos verticales originales en móvil. No se generan
  ni sustituyen imágenes: son las variantes existentes del mismo componente.
- La comparación de Ecosystem pasa 21 estados y tres capturas con cero píxeles
  distintos. About pasa escritorio y móvil, pero conserva diferencias de
  desplazamiento del texto en tableta: sigue pendiente, sin tolerancias nuevas.
- La regresión de Labs vuelve a pasar sus 21 estados, tres capturas y limpieza
  de pinning al alternar móvil/escritorio. El primer ajuste general de botones
  detectó una diferencia de fuente móvil; se corrigió antes de guardar el paso.
- Evidencias de la matriz inicial corregida: `phase-3-shared-stack-controls.json`
  y `phase-3-shared-stack-visual.json`. La comprobación estricta global sigue
  fallando por About/tableta e Inicio; esos resultados no autorizan publicación.
- Pasan nueve pruebas generales, hashes del build publicado y comprobación de
  recursos/aislamiento de las 137 rutas candidatas. La candidata sigue local.
- Verificación posterior de Inicio: móvil coincide en 7/7 estados y cero píxeles
  distintos; escritorio coincide en geometría, con 586 píxeles diferentes
  limitados al botón de la segunda tarjeta. En tableta la repetición pasó de
  7/7 a 2/7 estados: se registra la variación y se compara el original consigo
  mismo antes de atribuirla a la candidata. Evidencias actualizadas de Inicio:
  `phase-3-home-stack-controls.json` y `phase-3-home-stack-visual.json`.
- Control original/original a 768 px: Inicio y About coinciden en 7/7 estados y
  cero píxeles. Esta ejecución no reproduce la variación observada; por tanto no
  se descarta como ruido ni se aprueba la tableta. Evidencias:
  `phase-3-stack-reference-repeat-controls.json` y
  `phase-3-stack-reference-repeat-visual.json`. Próximo paso: aislar las medidas
  de los disparadores del texto y el orden de refresco al cargar imágenes.

### Medidas de texto y restauración del apilado (2026-10-11)

- El controlador espera a las fuentes antes de medir. La inicialización está
  protegida frente a montajes duplicados y al retorno desde el historial.
- Se localiza la diferencia de About: la aplicación antigua calcula el movimiento
  con dos columnas y después su parche retira las imágenes y ensancha el texto.
  El componente nativo conserva esas medidas con un elemento invisible temporal,
  sin recuperar imágenes, peticiones ni runtime antiguo. Recalcula al variar el
  ancho y retira inmediatamente el elemento de medición.
- El original presenta dos recorridos según el orden de carga: a 768 px y scroll
  1582, el texto de la primera tarjeta queda en y=187.5845 o y=143.5600, pese a
  empezar con idénticas dimensiones. Se conserva esa evidencia en
  `phase-3-about-original-variability.json`; no se disimula con tolerancias.
- La implementación final coincide con el recorrido original de dos columnas:
  28/28 estados y cero píxeles en cuatro capturas (1440, 1024, 768 y 390 px).
  Evidencias: `phase-3-about-stack-final-controls.json` y `...-visual.json`.
- About y Ecosystem pasan además desmontaje/restauración de historial, cambio
  móvil/escritorio y ausencia de contenedores duplicados. Sus capturas móviles
  también coinciden: `phase-3-stack-history-controls.json` y `...-visual.json`.
- La regresión de Labs pasa 21 estados y tres capturas. Pasan las nueve pruebas
  generales y la revisión de las 137 rutas. No se cambia el build publicado.
- Sigue pendiente el botón de la segunda tarjeta de Inicio a 1440 px: 586 píxeles
  diferentes con geometría, estilos calculados y contenedores equivalentes.
  El control original/original coincide. Diagnóstico guardado en
  `phase-3-stack-button-diagnostics.json`; no se declara aprobado ese resultado.
- Se identifica otra interacción pendiente para la siguiente revisión: el botón
  sólido original alterna clases de hover/active mediante React (módulo 788415).
  El controlador nativo aún no reproduce ese estado. Debe verificarse por variante
  antes de trasladarlo; no basta con aprobar la captura estática.

### Estados nativos de botones sólidos (2026-10-11)

- Se trasladan los estados de ratón del componente original (módulos 788415 y
  882168) a eventos delegados en `main`: hover, pulsación, liberación y salida.
  Se conservan las dos paletas sólidas y el resplandor original. El foco sigue
  usando sus clases CSS existentes. Los botones insertados por carruseles usan
  el mismo controlador sin registrar nuevas colecciones de listeners.
- Se respeta `disabled`/`aria-disabled` y se limpia el estado al abandonar la
  página. No se interceptan enlaces, envíos, clics ni comportamiento de teclado.
- `check-native-buttons.mjs` compara dos paletas a 390 y 1440 px, en seis estados:
  normal, hover, pulsado, liberado, salida y foco de teclado. Pasan 24/24 estados,
  24 capturas del botón y 24 capturas ampliadas que incluyen el resplandor, todas
  con cero píxeles diferentes. También pasan deshabilitación y limpieza de estado.
  Evidencias: `phase-3-button-states-controls.json` y `...-visual.json`.
- Pasan las nueve pruebas generales y la revisión de recursos de las 137 rutas.
  La revisión de Inicio en su punto concreto de scroll conserva los 586 píxeles
  diferentes anteriores; no se confunde esa comparación con las capturas de
  estados que sí pasan. No se publica la candidata ni se aprueba paridad global.
- Este paso cubre botones sólidos de contenido; botones outlined/secondary y
  otros controles conservan su revisión específica pendiente.
- Diagnóstico adicional del botón escalado: tres capturas consecutivas sin
  modificaciones conservan los mismos 586 píxeles; no es una captura prematura.
  Cambiar temporalmente transform/backface/isolation después de pintar produce
  una coincidencia exacta, pero aplicar backface desde la carga no la reproduce.
  Se retira esa prueba del código; no se introduce un repintado forzado ni un
  cambio cosmético sin verificar. Se guardan los resultados en
  `phase-3-button-repeat-paints.json` y `phase-3-button-layer-experiment.json`.

### 2026-10-12 — Contorno, subrayado y activación del foco

- Se amplía el controlador delegado de CTA a las paletas clara/oscura de botones
  outlined y secondary, conservando los estados de los módulos originales 788415
  y 882168. El inventario de plantillas encuentra 41 botones de contorno y cinco
  secundarios repartidos entre 16 páginas. No se cambian textos ni destinos.
- La inspección de Chrome detectó que el modo de teclado original no se había
  migrado: `body:not(.user-is-tabbing)` anulaba el contorno con `!important`.
  Se restaura el listener del módulo 531845: el primer Tab añade la clase y retira
  el listener. Se conserva el CSS original, sin imponer nuevos estilos de foco.
- El comparador admite `YAJU_BUTTON_VARIANTS=extended` y usa selectores estables
  mientras cambian los colores. Ahora registra también outline y outlineOffset.
- Pasan las nueve pruebas generales, los 1201 archivos invariantes y el control
  de recursos/aislamiento de las 137 páginas nativas. La candidata sigue local;
  los resultados visuales de este paso se registran a continuación.
- Resultado: 48/48 estados coinciden en estilos computados, incluido el foco;
  41/48 capturas del propio botón y 39/48 capturas con margen son exactas.
  Permanecen 15 píxeles en el secundario oscuro de Catalyst Grants a 390 px,
  dos en su captura de foco a 1440 px y pequeñas diferencias de 14–26 píxeles
  en el margen del outlined oscuro. No se declaran resueltas ni se atribuyen
  a antialiasing sin una prueba adicional. El comparador estricto sigue fallando
  por esas diferencias. Evidencias: `phase-3-button-extended-controls.json` y
  `phase-3-button-extended-visual.json`.
- Regresión de sólidos: 24/24 estados y ambas regiones de captura exactos,
  incluido el foco restaurado (`phase-3-button-solid-regression-visual.json`).
  No se publica ni se aprueba paridad global con estos resultados parciales.

### 2026-10-12 — Apertura de FAQ y geometría de Catalyst Grants

- La investigación de los píxeles del CTA encontró una diferencia real de altura:
  las FAQ nativas de Catalyst Grants abrían la primera respuesta durante un salto
  directo al final de la página. Añadían 192 px que no estaban en el original.
- El módulo original 712852 (`16-v97tszng7x.js`) usa `useInView` sobre la columna
  que contiene la lista, con `threshold: .3` y `triggerOnce: true`. Se restaura
  ese objetivo y umbral en acordeones múltiples, comprobando `intersectionRatio`
  además de `isIntersecting`. Los acordeones de selección única no se modifican.
- `check-native-faq-reveal.mjs` contrasta Catalyst Grants y Pricing a 390/1440 px:
  salto al final, 15% y 50% visible, apertura de segunda respuesta y cierre de
  primera. Coinciden las alturas y estados de las cinco etapas en los cuatro pares.
  Evidencia: `phase-3-faq-reveal-controls.json`.
- Regresión completa: 327 interacciones, 24 páginas, 72 combinaciones de página
  y anchura pasan. También pasan las nueve pruebas generales, los 1201 archivos
  invariantes y la revisión de recursos de las 137 rutas nativas.
- Catalyst Grants móvil recupera la geometría exacta de todas sus secciones y
  del CTA, incluida la posición de scroll. Los seis estados del botón ahora dan
  cero píxeles distintos. Cinco de sus seis capturas ampliadas también coinciden;
  la de pulsación conserva diez píxeles en el margen. Se registra como pendiente,
  sin reducir el umbral ni imponer un repintado al producto. Evidencias:
  `phase-3-catalyst-reveal-geometry.json`, `phase-3-catalyst-button-after-reveal.json`.
- El comparador admite casos/anchuras/salida elegibles, diagnósticos y dos cargas
  del propio original (`YAJU_COMPARE_REFERENCE=1`). Esa prueba también muestra
  variabilidad: ocho de 24 capturas ampliadas difieren, seis de ellas con cambios
  dentro del botón oscuro móvil aun con geometría idéntica. Esto no demuestra que
  todas las diferencias nativo/original tengan esa causa. Evidencia:
  `phase-3-button-original-variability.json`. La candidata sigue sin publicarse.

### 2026-10-12 — Comparaciones de CTA desde una sola captura

- Se cambia únicamente el instrumento de verificación: el botón y su margen se
  recortan de un mismo PNG del viewport. Antes se pedían dos capturas independientes
  a Chrome, que podían rasterizar otra vez el contenido. No se alteran CSS, HTML,
  animaciones ni comportamiento de la candidata. No hay máscaras ni tolerancias.
- Se incorpora la geometría del botón y el scroll a la condición de aprobación,
  junto a colores, foco y comparación RGBA exacta. Se comprueba la sintaxis y se
  aplica esa condición también a los resultados de las ejecuciones terminadas.
- Resultado de esta ejecución: 72/72 estados nativo/original coinciden en estilos,
  geometría, botón y margen. Incluye seis variantes (sólidos, contorno y secundarios,
  en paletas clara/oscura), seis estados y dos anchuras (390/1440).
  Evidencia consolidada: `phase-3-buttons-single-paint-visual.json`.
- Control independiente original/original: 18/24 comparaciones exactas. Los seis
  estados del secundario oscuro móvil todavía varían entre cargas del original,
  aun con geometría/estilos idénticos. El cambio de captura elimina las pequeñas
  discrepancias de la comparación nativa observada, pero no elimina toda la
  variabilidad de la referencia; no se afirma reproducibilidad universal.
- Este paso no cambia la web servida ni requiere repetir las pruebas generales
  que ya pasaron para ed49468. Continúan pendientes las verificaciones globales
  y el caso específico del botón escalado en Inicio; no se publica la candidata.

### 2026-10-12 — Diagnóstico del CTA escalado de Inicio

- Se reproduce el caso a 1440×900 y scroll 2644. Una ejecución sin sincronización
  midió 0,421875 px de desplazamiento antes de la captura y 998 píxeles distintos;
  no se interpreta esa medición previa como una nueva regresión de layout.
- Se añade un modo diagnóstico `YAJU_STACK_SYNC_PAINT=1` que captura y espera dos
  frames antes de medir cada punto. Con ese modo coinciden los siete estados
  geométricos y reaparece la diferencia estable de 586 píxeles del botón. El
  original comparado consigo mismo coincide en siete estados y cero píxeles.
- Una prueba sin GPU (`YAJU_TEST_SOFTWARE_RENDERING=1`) conserva geometría exacta
  pero 616 píxeles distintos. Por tanto, no se declara resuelto al cambiar renderer.
- Se prueban estilos exclusivamente interceptando el documento en el navegador:
  `translateZ(0)` desde la carga empeora a 1119 píxeles; `isolation:isolate` conserva
  586. Ninguno se aplica al código del frontend. Las opciones diagnósticas no
  intervienen en las pruebas normales ni en ningún build publicado.
- Evidencia: `phase-3-home-button-render-diagnostics.json`. La causa precisa de
  rasterización sigue abierta; no se cambia el diseño, la referencia ni el umbral.
  No se publica y no se marca como aprobada la paridad visual de Inicio.

### 2026-10-12 — Cabecera compartida y recorrido completo de un artículo

- La comparación del artículo `/blog/the-future-of-work-debate-has-an-evidence-problem`
  detectó 49.693 píxeles distintos en Product: la cabecera nativa conservaba las
  cuatro promociones anteriores a las actualizaciones de marca. Se restauran las
  imágenes, logos, textos y destino del Blog ya presentes en la referencia, dentro
  del fragmento estático `header-3f7462eb5ea0`; no se añade un parche de navegador.
- Se restaura también el enlace Agentic Task Ecosystem en Explorations, ausente en
  ese fragmento. La cabecera la comparten el artículo, `/blog/tag/technology` y
  `/labs/open-development/application`. Las plantillas móviles no se sustituyen
  por las de escritorio: su contenido actual coincide con el original probado.
- El comparador admite ahora carpeta de salida independiente, recorrido vertical
  completo con solapamiento y prueba de todos los menús en cualquier ruta. Se
  mantiene el umbral de cero píxeles y la validación de hashes de la referencia.
- Recorrido del artículo con movimiento normal: 25/25 capturas exactas en
  1440×900, 768×1024 y 390×844, incluyendo inicio y final de página. Vídeos pausados
  y animaciones CSS finalizadas durante la captura, como en el comparador existente.
- Navegación tras la corrección: 22/23 capturas exactas. Todos los desplegables
  coinciden; queda una línea de 390 píxeles distinta en la apertura del menú raíz
  móvil, con las posiciones medidas del logo y cierre idénticas. En la ejecución
  anterior esa apertura coincidía y el menú Blog de tablet variaba 54 píxeles en
  el borde inferior; no se atribuye una causa sin demostrarla ni se relaja el umbral.
- Evidencia: `phase-3-article-header-and-scroll.json`. Pasan los nueve tests de
  `npm run verify`, la paridad de 1201 archivos de producción y la comprobación
  de recursos/runtime de las 137 páginas nativas. Se actualiza la vista local;
  la migración global sigue pendiente y no se publica esta candidata.
- Las otras dos rutas que comparten la cabecera pasan 14/14 capturas de portada,
  Product y scroll en las tres anchuras (seis pares ruta/viewport).

### 2026-10-12 — Control del menú móvil y carga de todas las rutas

- Se repite la prueba de navegación móvil del artículo con comparación estricta:
  7/8 estados exactos; la apertura del menú raíz conserva 390 píxeles distintos,
  todos en la fila y=161. El único cambio es el canal verde: RGBA (232,231,230,255)
  frente a (232,232,230,255). El control original/original pasa 8/8 estados.
- Las mediciones del panel, la cabecera y el overlay coinciden: límite fraccional
  161,40625 px, fondo blanco, overlay rgba(33,33,33,.2), blur(30px), opacidad 1 y
  mismos z-index. No se ha demostrado la causa de composición y no se introduce
  un ajuste visual ni tolerancia para ocultar la diferencia.
- Evidencia reproducible del control y capas: `phase-3-mobile-menu-edge-control.json`.
- `check-native-browser.mjs` admite `YAJU_TEST_ORIGIN`, conservando 4183 por defecto.
  Esto permite auditar directamente la vista actual en 4184 sin modificar el script
  en cada ejecución. Las 137 páginas cargan con contenido, sin excepciones JS,
  respuestas locales >=400 detectadas ni peticiones al runtime legado monitorizado.
  La prueba usa escritorio y movimiento reducido, bloquea recursos externos y no
  sustituye la revisión visual ni una prueba real del backend de formularios.
- Se recorren completos `/blog/what-your-corpus-leaves-out` y
  `/customer-stories/agents-in-enterprise-integration`, incluyendo sus cinco menús,
  en escritorio/tablet/móvil: 78/79 capturas exactas. La única diferencia son
  388 píxeles en la apertura del menú raíz del artículo en móvil. Todos los
  estados de contenido y submenús coinciden. Ambas páginas usan la cabecera
  compartida por 100 rutas; no se extrapola la paridad a esas cien páginas.
- Evidencia: `phase-3-editorial-and-browser-coverage.json`. No se cambia código
  servido ni se publica. Sigue pendiente el borde móvil, el CTA escalado de Inicio
  y las demás limitaciones registradas en las fases anteriores.

### 2026-10-12 — Recorrido completo de Agent Academy y Scholars

- Se comparan `/agent-academy` y `/labs/scholars` con movimiento normal en
  1440×900, 768×1024 y 390×844. Se recorren con capturas solapadas hasta el pie
  y se abren los cinco desplegables de navegación en cada anchura.
- Resultado: 133/133 capturas con cero píxeles distintos. Esto amplía la cobertura
  de ambas páginas completas y sus menús, sin extrapolarla al resto de rutas.
  Se mantienen las condiciones del comparador: medios externos compartidos,
  vídeos pausados y animaciones CSS finalizadas durante la captura.
- Evidencia: `phase-3-academy-scholars-full.json`. No se modifica el código servido.
- Se añade `scripts/check-native-navigation.mjs`: un consumidor por cada
  una de las siete cabeceras estándar, a 1440/768/390 px. Pasan 119 comprobaciones
  en 21 pares ruta/anchura: navegación con teclado por los cinco submenús, Back,
  Escape, devolución del foco en móvil y cierre/desbloqueo del scroll al pasar
  a escritorio. Campaña y registro tienen navegación separada y no se incluyen.
- La prueba usa un selector estable para el botón que cambia de nombre al abrir
  y el selector accesible de Back empleado por las pruebas previas. Los errores
  iniciales de selectores pertenecían al test, no al código del sitio. Evidencia:
  `phase-3-standard-header-keyboard.json`. No se publica: continúan pendientes
  las diferencias de composición ya documentadas y el resto de cobertura global.

### 2026-10-13 — Fechas de tarjetas y paginación

- La comparación de todas las páginas de artículos en Observability detectó una
  regresión real: las instantáneas nativas conservaban abreviaturas españolas
  (`abr`, `sept`) aunque el navegador de referencia estaba configurado en inglés.
- Se incorporan metadatos de fecha al HTML de las tarjetas y sus estados dinámicos.
  El cliente aplica el formateador original (`new Date`, mes corto del idioma del
  navegador, día de dos dígitos y año local) al cargar y al cambiar de estado.
  Se mantienen las etiquetas, clases, estilos, enlaces y textos de las tarjetas.
- Se recuperan 22 valores de publicación originales para 21 enlaces desde los
  datos de la referencia congelada; se guardan en `src/content/card-dates.json`,
  sin dependencia de esa referencia durante la compilación. Un enlace de Financial
  Services aparece con dos fechas distintas: se conserva cada variante. La hora
  original importa para el cambio de día en otros husos horarios.
- Alcance: nueve páginas, 22 fechas iniciales y 14 apariciones en estados de
  paginación. Tres tests cubren abreviaturas de ambos idiomas, idempotencia,
  preservación de contenido y horas distintas del mismo enlace.
- El comparador visual permite elegir idioma y recorrer la paginación, validando
  número de tarjetas, enlaces y textos. Captura cada tarjeta y su pantalla completa.
  La exploración en escritorio produjo 9/14 regiones exactas tanto en inglés como
  en español; otras cinco portadas difieren pese a geometría coincidente. El ensayo
  de tablet se detuvo por rasterización inestable de la referencia. Estos resultados
  no aprueban visualmente los bloques ni se ocultan con tolerancias; quedan pendientes.
- Verificación final de fechas: 27/27 pares página/configuración, 42 estados y
  108 fechas idénticas a la referencia (en-US/Madrid, es-ES/Madrid y en-US/Los
  Ángeles). Incluye la carga inicial de las nueve rutas y todas las páginas de
  ambos bloques numerados. Evidencia: `phase-3-card-dates-locale-parity.json`.
- Los 12 tests generales pasan, junto con la paridad de 1201 archivos publicados
  y el control de recursos/runtime de las 137 páginas nativas. El nuevo JSON se
  registra explícitamente como dependencia de compilación, no como archivo público.
- `phase-3-pagination-visual-findings.json` conserva los resultados exploratorios
  y sus límites; no se consideran aceptación visual final. La vista local queda
  actualizada. No se publica la candidata mientras continúen las diferencias abiertas.

### 2026-10-13 — Entrada de tarjetas paginadas

- Se recupera el comportamiento del grupo original: las tarjetas se revelan una
  sola vez cuando el 20% de su cuadrícula entra en pantalla. El observador genérico
  deja de intervenir en esos bloques. Pulsar la página ya seleccionada conserva
  sus nodos y evita reiniciar las animaciones.
- `scripts/check-native-pagination-reveal.mjs` compara Observability y Financial
  Services con la referencia a 1440, 768 y 390 px. Pasan 36 comprobaciones en seis
  pares: antes de entrar, al 15% y 25%, al salir, al repetir la página seleccionada
  y al cambiar de página. Son comprobaciones de comportamiento y clases de
  animación, no una aprobación visual. Evidencia: `phase-3-pagination-entry-controls.json`.
- Una comprobación anterior encontró incompleta la carpeta generada
  `artifacts/native-all` (faltaba About). No se ha confirmado su causa. Se ha
  reconstruido secuencialmente y verificado de nuevo antes y después de los tests
  generales: las 137 páginas tienen títulos, analítica y recursos locales válidos.
  La prueba de fallo de compilación usa una carpeta temporal independiente.
- Los 12 tests generales y los 1201 archivos de referencia publicados siguen
  pasando. La candidata local se actualiza con la compilación completa.
- El recorrido en Chrome carga las 137 páginas sin errores JavaScript, recursos
  locales ausentes ni solicitudes del runtime antiguo. Este recorrido comprueba
  la carga inicial; no sustituye las comparaciones visuales ni todas las interacciones.
- Las comparaciones exploratorias de portadas siguen mostrando diferencias;
  no se relaja la tolerancia ni se declaran resueltas. Las capturas realizadas
  alrededor del incidente de archivos ausentes tampoco se usan como aceptación.
  No se publica esta candidata.
