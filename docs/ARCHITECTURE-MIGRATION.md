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
