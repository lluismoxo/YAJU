// Development-only comparison. No requests to production APIs or analytics are sent.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const paths = [process.env.YAJU_BROWSER_MODULES, root].filter(Boolean);
const { chromium } = require(require.resolve('playwright', { paths }));
const { PNG } = require(require.resolve('pngjs', { paths }));
const baselineDirectory = process.argv[2];
if (!baselineDirectory) throw new Error('Usage: node scripts/visual-parity.mjs <frozen-reference-directory>');
const fixture = JSON.parse(await readFile(resolve(root, 'tests/fixtures/production-a1c700f.sha256.json'), 'utf8'));
for (const [name, hash] of Object.entries(fixture.files)) {
  const bytes = await readFile(resolve(baselineDirectory, name));
  assert.equal(createHash('sha256').update(bytes).digest('hex'), hash, `Modified reference: ${name}`);
}
const artifacts = resolve(root, 'artifacts/visual-parity');
await mkdir(artifacts, { recursive: true });
const routes = ['/', '/labs/scholars', '/agent-academy'];
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];
const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.webp':'image/webp',
  '.woff2':'font/woff2', '.woff':'font/woff', '.mp4':'video/mp4' };
async function serve(directory) {
  const base = resolve(directory);
  const server = createServer(async (req, res) => {
    try {
      let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      let file = resolve(base, '.' + pathname);
      if (file !== base && !file.startsWith(base + sep)) throw new Error('Outside root');
      if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
      const data = await readFile(file);
      res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
      res.end(data);
    } catch { res.writeHead(404); res.end('Not found'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { origin: `http://127.0.0.1:${server.address().port}`, server };
}
const reference = await serve(baselineDirectory);
const candidate = await serve(resolve(root, 'public'));
const browser = await chromium.launch({ headless: true, channel: 'chrome' }).catch(error => { reference.server.close(); candidate.server.close(); throw error; });
const externalMedia = new Map();
const report = { browser: browser.version(), baseline: 'a1c700f', generatedAt: new Date().toISOString(), results: [] };

async function prepare(page, origin, route) {
  const errors = [];
  page.on('pageerror', error => errors.push({ name: error.name, message: error.message }));
  await page.route('**/*', async request => {
    const url = new URL(request.request().url());
    if (url.origin === origin || url.protocol === 'data:') return request.continue();
    // Cache read-only media once so both renderings receive identical CDN bytes.
    // Analytics, third-party scripts, API calls and submissions remain blocked.
    if (['image', 'font'].includes(request.request().resourceType()) && request.request().method() === 'GET') {
      if (!externalMedia.has(url.href)) externalMedia.set(url.href, (async () => {
        try {
          const response = await request.fetch({timeout:15000});
          return {status:response.status(), contentType:response.headers()['content-type'], body:await response.body()};
        } catch { return null; }
      })());
      const media = await externalMedia.get(url.href);
      if (media) return request.fulfill(media);
    }
    return request.abort();
  });
  await page.goto(origin + route, { waitUntil: 'load', timeout: 30000 });
  await page.evaluate(() => document.fonts.ready);
  // Existing compatibility layer runs 750ms after load, then at 500ms and 1500ms.
  await page.waitForTimeout(3000);
  await page.addStyleTag({ content: '*,:before,:after{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}' });
  await page.evaluate(() => { document.querySelectorAll('video').forEach(video => { video.pause(); video.currentTime = 0; }); });
  assert.ok((await page.locator('main').innerText()).trim().length > 100, `Blank main: ${route}`);
  return errors;
}
async function compare(left, right, key) {
  const a = PNG.sync.read(left), b = PNG.sync.read(right);
  if (a.width !== b.width || a.height !== b.height) return { key, pass:false, reason:'dimensions differ', reference:[a.width,a.height], candidate:[b.width,b.height] };
  let pixels = 0;
  for (let i=0;i<a.data.length;i+=4) {
    if (a.data[i]!==b.data[i] || a.data[i+1]!==b.data[i+1] || a.data[i+2]!==b.data[i+2] || a.data[i+3]!==b.data[i+3]) pixels++;
  }
  return { key, pass:pixels===0, changedPixels:pixels, totalPixels:a.width*a.height };
}
try {
  for (const viewport of viewports) {
    for (const route of routes) {
      const key = `${viewport.name}-${route === '/' ? 'home' : route.slice(1).replaceAll('/', '-')}`;
      const contexts = await Promise.all([reference, candidate].map(() => browser.newContext({ viewport:{width:viewport.width,height:viewport.height}, deviceScaleFactor:1, locale:'en-US', timezoneId:'Europe/Madrid', reducedMotion:'reduce' })));
      const pages = await Promise.all(contexts.map(context => context.newPage()));
      const errors = await Promise.all(pages.map((page,index) => prepare(page, [reference,candidate][index].origin, route)));
      const states = [];
      async function capture(state) {
        await Promise.all(pages.map(page => page.evaluate(async () => {
          await Promise.all([...document.images].filter(image => { const r=image.getBoundingClientRect(); return r.bottom>0 && r.top<innerHeight; }).map(image => image.decode().catch(() => {})));
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        })));
        const shots = await Promise.all(pages.map((page,index) => page.screenshot({ path: resolve(artifacts, `${key}-${state}-${index ? 'candidate' : 'reference'}.png`), animations:'disabled' })));
        states.push(await compare(shots[0],shots[1],`${key}-${state}`));
      }
      await capture('top');
      if (viewport.name === 'desktop') {
        await Promise.all(pages.map(page => page.getByRole('link',{name:'Product',exact:true}).first().locator('xpath=ancestor::li[1]').hover()));
        await Promise.all(pages.map(page => page.waitForTimeout(300)));
        await capture('product-menu');
        await Promise.all(pages.map(page => page.mouse.move(10,500)));
      }
      await Promise.all(pages.map(page => page.evaluate(() => window.scrollTo(0,800))));
      await Promise.all(pages.map(page => page.waitForTimeout(1500)));
      await capture('scroll');
      const brokenImages = await Promise.all(pages.map(page => page.evaluate(() => [...document.images].filter(image => image.complete && !image.naturalWidth).map(image => ({src:image.getAttribute('src'), currentSrc:image.currentSrc})))));
      const errorParity = JSON.stringify(errors[0]) === JSON.stringify(errors[1]);
      const result = { route, viewport:viewport.name, errorParity, states, baselineErrors:errors[0], candidateErrors:errors[1], brokenImages }; 
      report.results.push(result);
      await writeFile(resolve(artifacts,'report.json'),JSON.stringify(report,null,2)+'\n');
      console.log(`${key}: ${states.every(state=>state.pass) ? 'PASS' : 'DIFFERENCES'} (${states.map(state=>state.changedPixels ?? state.reason).join(', ')})`);
      await Promise.all(contexts.map(context => context.close()));
    }
  }
} finally {
  await browser.close();
  reference.server.close();
  candidate.server.close();
}
const failed = report.results.flatMap(result=>result.states).filter(state=>!state.pass);
console.log(`Visual comparison: ${report.results.length} route/viewport pairs, ${failed.length} states differ.`);
if (failed.length || report.results.some(result => !result.errorParity)) process.exitCode = 1;
