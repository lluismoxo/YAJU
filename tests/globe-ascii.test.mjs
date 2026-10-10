import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { drawGlobeAscii, globeMetrics, globeReveal } from '../src/client/globe-ascii.js';

// Execute the preserved renderer as an independent oracle, not a rewritten formula.
const original = await readFile(new URL('../legacy/runtime/_next/static/immutable/chunks/13hla3ddapm5v.js', import.meta.url), 'utf8');
const start = original.indexOf('function(e,t){let r=t.width,n=t.height;w.clearRect');
const end = original.indexOf('}(o,e)', start);
assert.ok(start >= 0 && end > start, 'Original ASCII renderer must remain available');
const renderer = `(${original.slice(start, end + 1)})`;
function recordingContext() {
  return { calls: [], clearRect(...args) { this.calls.push(['clear', ...args]); }, fillText(...args) { this.calls.push(['text', ...args]); } };
}

test('Labs ASCII glyphs and coordinates match the original renderer at every reveal stage', () => {
  for (const viewport of [[390, 844], [900, 700], [1440, 900]]) {
    const metrics = globeMetrics(...viewport);
    for (const [width, height] of [[1, 1], [57, 39], [300, 300], [500, 500]]) {
      const pixels = new Uint8ClampedArray(width * height * 4);
      // Deterministic colour field covers dark, bright and differently coloured samples.
      for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 73 + Math.floor(i / 11) * 31) % 256;
      for (const elapsed of [0, 250, 1250, 2499, 2500, 5000]) {
        const reveal = globeReveal(elapsed);
        const expected = recordingContext();
        const actual = recordingContext();
        const render = vm.runInNewContext(renderer, {
          w: expected, _: reveal, O: metrics.fontSize, E: metrics.cellSize,
          i: '#ffffff', d: 1.05, s: 0.7, u: 1.05, j: " .:,'-^=*+?!|0#X%WM@",
        });
        render({ getImageData: () => ({ data: pixels }) }, { width, height });
        drawGlobeAscii(actual, pixels, width, height, { ...metrics, reveal });
        assert.deepEqual(actual.calls, expected.calls, `${viewport}: ${width}×${height}, ${elapsed}ms`);
        for (const key of ['font', 'fillStyle', 'textAlign', 'textBaseline', 'globalAlpha']) assert.equal(actual[key], expected[key]);
      }
    }
  }
});

test('Labs camera distance preserves the original responsive breakpoints', () => {
  for (const [size, altitude] of [[390, 1.8], [499, 1.8], [500, 1.6], [767, 1.6], [768, 1.4], [1023, 1.4], [1024, 1.3]]) {
    assert.equal(globeMetrics(1440, size).altitude, altitude);
  }
});
