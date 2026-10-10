import Globe from 'globe.gl';
import { drawGlobeAscii, globeMetrics, globeReveal } from './globe-ascii.js';

// This controller owns only the Labs globe, including its canvases and listeners.
function mountGlobe(container) {
  const host = container.querySelector('.globe-viz');
  if (!host) return () => {};
  host.replaceChildren();
  let globe, frame = 0, timer = 0, disposed = false;
  const listeners = new AbortController();
  const overlay = document.createElement('canvas');
  Object.assign(overlay.style, { position: 'absolute', top: '0px', left: '0px', width: '100%', height: '100%', pointerEvents: 'none', background: 'transparent', zIndex: '10', transition: 'opacity 1.5s ease-in' });
  const sample = document.createElement('canvas');
  const output = overlay.getContext('2d', { willReadFrequently: true });
  const input = sample.getContext('2d', { willReadFrequently: true });
  let metrics = globeMetrics(innerWidth, innerHeight);
  function resize() {
    if (!globe || disposed) return;
    const width = host.clientWidth || innerWidth;
    const height = host.clientHeight || innerHeight;
    globe.width(width).height(height);
    globe.camera().aspect = width / height;
    globe.camera().updateProjectionMatrix();
    globe.renderer().setSize(width, height);
    metrics = globeMetrics(innerWidth, innerHeight);
    globe.pointOfView({ ...globe.pointOfView(), altitude: metrics.altitude }, 0);
    overlay.width = sample.width = width;
    overlay.height = sample.height = height;
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    clearTimeout(timer);
    cancelAnimationFrame(frame);
    listeners.abort();
    globe?._destructor();
    globe?.controls().dispose();
    globe?.renderer().dispose();
    host.replaceChildren();
  }
  try {
    if (!output || !input) return dispose;
    globe = Globe()(host)
      .globeImageUrl('/assets/globe/earth-blue-marble.jpg')
      .bumpImageUrl('/assets/globe/earth-topology.png')
      .showAtmosphere(false)
      .width(host.clientWidth || innerWidth).height(host.clientHeight || innerHeight);
    const canvas = globe.renderer().domElement;
    canvas.style.opacity = '0';
    globe.globeMaterial().bumpScale = 10;
    // Match the original delay before ASCII scene setup.
    timer = setTimeout(() => {
      if (disposed) return;
      try {
        globe.lights().find(light => light.type === 'DirectionalLight')?.position.set(1, 1, 1);
        const controls = globe.controls();
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.5;
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = false;
        controls.enableRotate = !(matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0);
        host.append(overlay);
        resize();
        window.addEventListener('resize', resize, { signal: listeners.signal });
        let dragging = false;
        for (const [event, handler] of Object.entries({
          mousedown: () => { dragging = true; canvas.style.cursor = 'grabbing'; },
          mouseup: () => { dragging = false; canvas.style.cursor = 'grab'; },
          mouseenter: () => { if (!dragging) canvas.style.cursor = 'grab'; },
          mouseleave: () => { dragging = false; canvas.style.cursor = 'default'; },
        })) canvas.addEventListener(event, handler, { signal: listeners.signal });
        const started = Date.now();
        function paint() {
          if (disposed) return;
          globe.renderer().render(globe.scene(), globe.camera());
          input.drawImage(canvas, 0, 0, sample.width, sample.height);
          drawGlobeAscii(output, input.getImageData(0, 0, sample.width, sample.height).data, sample.width, sample.height, { ...metrics, reveal: globeReveal(Date.now() - started) });
          frame = requestAnimationFrame(paint);
        }
        paint();
        host.classList.add('loaded');
      } catch (error) { dispose(); console.error('Labs globe initialization failed', error); }
    }, 1200);
  } catch (error) { dispose(); console.error('Labs globe unavailable', error); }
  return dispose;
}

let cleanup = [];
function mount() { cleanup = [...document.querySelectorAll('.globe-animation-container')].map(mountGlobe); }
mount();
window.addEventListener('pagehide', () => { cleanup.forEach(dispose => dispose()); cleanup = []; });
window.addEventListener('pageshow', event => { if (event.persisted) mount(); });
