import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const inputs = JSON.parse(await readFile(resolve(root, 'config/site-inputs.json'), 'utf8'));
const htmlInputs = inputs.filter(entry => entry.output.endsWith('.html'));

test('every public source has exactly one manifest entry; private code is excluded', async () => {
  const expected = new Set(inputs.map(entry => entry.source));
  assert.equal(expected.size, inputs.length);
  assert.equal(new Set(inputs.map(entry => entry.output)).size, inputs.length);
  async function walk(dir) {
    for (const entry of await readdir(resolve(root, dir), { withFileTypes: true })) {
      const name = `${dir}/${entry.name}`;
      if (entry.isDirectory()) await walk(name);
      else assert.ok(expected.delete(name), `Unregistered public source: ${name}`);
    }
  }
  for (const dir of ['src/pages', 'src/content', 'src/client', 'static', 'legacy/runtime']) await walk(dir);
  assert.equal(expected.size, 0, `Missing sources: ${[...expected]}`);
  for (const entry of inputs) assert.ok(!/(^|\/)(supabase|scripts|tests|docs|config|\.env[^/]*)(\/|$)/.test(entry.output));
});

test('rendered internal page links and script/style resources resolve in the build', async () => {
  const missing = [];
  for (const entry of htmlInputs) {
    const html = await readFile(resolve(root, 'public', entry.output), 'utf8');
    for (const tag of html.matchAll(/<(a|script|link)\b[^>]*>/gi)) {
      const href = tag[0].match(/\b(?:href|src)="([^"]+)"/i)?.[1];
      if (entry.output === 'lp/thank-you/index.html' && href === '{{downloadLink}}') continue; // Existing server-populated form fragment.
      if (!href || href.startsWith('#') || /^(mailto|tel|javascript|data):/.test(href)) continue;
      const url = new URL(href, `https://yajuas.com/${entry.output.replace(/index\.html$/, '')}`);
      if (!['yajuas.com', 'www.yajuas.com'].includes(url.hostname)) continue;
      if (['/_vercel/insights/script.js', '/_vercel/speed-insights/script.js'].includes(url.pathname)) continue; // Served by Vercel, not static build files.
      const path = decodeURIComponent(url.pathname).replace(/^\//, '');
      const candidates = [path, `${path.replace(/\/$/, '')}/index.html`, `${path}.html`];
      if (!path) candidates.push('index.html');
      let found = false;
      for (const candidate of candidates) {
        try { await access(resolve(root, 'public', candidate)); found = true; break; } catch {}
      }
      if (!found) missing.push(`${entry.output}: ${href}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('analytics is injected once per complete page and never into fragments', async () => {
  let pages = 0;
  let fragments = 0;
  for (const entry of htmlInputs) {
    const html = await readFile(resolve(root, 'public', entry.output), 'utf8');
    const count = html.split("gtag('config', 'G-3T9YSET1R9')").length - 1;
    if (html.includes('<head>')) { pages++; assert.equal(count, 1, entry.output); }
    else { fragments++; assert.equal(count, 0, entry.output); }
  }
  assert.equal(pages, 186);
  assert.equal(fragments, 7);
});

test('generated website contains no server sources, tools or credentials', async () => {
  for (const name of ['supabase', 'scripts', 'tests', 'docs', 'config', '.env.local', 'package.json', 'vercel-build.sh']) {
    await assert.rejects(access(resolve(root, 'public', name)), { code: 'ENOENT' });
  }
});

test('an invalid input cannot replace the last successful build', async () => {
  const { mkdtemp, mkdir, writeFile, cp, rm } = await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { spawnSync } = await import('node:child_process');
  const temp = await mkdtemp(resolve(tmpdir(), 'yaju-build-failure-'));
  try {
    for (const dir of ['scripts', 'config', 'static/assets', 'src/components', 'public']) await mkdir(resolve(temp, dir), { recursive: true });
    await cp(resolve(root, 'scripts/build.mjs'), resolve(temp, 'scripts/build.mjs'));
    await cp(resolve(root, 'config/site.mjs'), resolve(temp, 'config/site.mjs'));
    await cp(resolve(root, 'src/components/redirect.mjs'), resolve(temp, 'src/components/redirect.mjs'));
    await writeFile(resolve(temp, 'static/assets/yaju-hydration-safe.css'), '');
    await writeFile(resolve(temp, 'public/index.html'), 'last good build');
    for (const badSource of ['.env.local', 'src/pages/../../.env.local', 'src/pages/missing.html']) {
      await writeFile(resolve(temp, 'config/site-inputs.json'), JSON.stringify([{source:badSource, output:'index.html'}]));
      const result = spawnSync(process.execPath, ['scripts/build.mjs'], {cwd:temp, encoding:'utf8'});
      assert.notEqual(result.status, 0, `Accepted invalid source: ${badSource}`);
      assert.equal(await readFile(resolve(temp, 'public/index.html'), 'utf8'), 'last good build');
    }
  } finally { await rm(temp, {recursive:true,force:true}); }
});
