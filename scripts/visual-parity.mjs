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
const routes = process.argv[4]?.split(',') || ['/', '/labs/scholars', '/agent-academy'];
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
].filter(viewport=>!process.env.YAJU_TEST_VIEWPORTS||process.env.YAJU_TEST_VIEWPORTS.split(',').includes(viewport.name));
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
const candidate = await serve(process.argv[3] || resolve(root, 'public'));
const softwareRendering = process.env.YAJU_TEST_SOFTWARE_RENDERING === '1';
const browser = await chromium.launch({ headless: true, channel: 'chrome', ...(softwareRendering ? {args:['--disable-gpu']} : {}) }).catch(error => { reference.server.close(); candidate.server.close(); throw error; });
const externalMedia = new Map();
const motion = process.env.YAJU_TEST_MOTION === 'normal' ? 'no-preference' : 'reduce';
const report = { motion, rendering:softwareRendering?'software':'default', browser: browser.version(), baseline: 'a1c700f', generatedAt: new Date().toISOString(), results: [] };

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
  if (motion === 'reduce') await page.addStyleTag({ content: '*,:before,:after{animation:none!important;transition:none!important;scroll-behavior:auto!important;caret-color:transparent!important}' });
  await page.evaluate(() => { document.querySelectorAll('video').forEach(video => { video.pause(); video.currentTime = 0; }); });
  const content=route==='/register' ? page.locator('body') : page.locator('main');
  assert.ok((await content.innerText()).trim().length > 100, `Blank main: ${route}`);
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
      const contexts = await Promise.all([reference, candidate].map(() => browser.newContext({ viewport:{width:viewport.width,height:viewport.height}, deviceScaleFactor:1, locale:'en-US', timezoneId:'Europe/Madrid', reducedMotion:motion })));
      const pages = await Promise.all(contexts.map(context => context.newPage()));
      const errors = await Promise.all(pages.map((page,index) => prepare(page, [reference,candidate][index].origin, route)));
      const states = [];
      async function capture(state, selector) {
        let clip;
        if(selector){
          const bounds=await Promise.all(pages.map(page=>page.locator(selector).boundingBox()));
          assert.ok(bounds[0],`Missing comparison region: ${selector}`);
          assert.deepEqual(bounds[1],bounds[0],`Region geometry: ${key}-${state}`);
          clip=bounds[0];
        }
        await Promise.all(pages.map(page => page.evaluate(async () => {
          await Promise.all([...document.images].filter(image => { const r=image.getBoundingClientRect(); return r.bottom>0 && r.top<innerHeight; }).map(image => image.decode().catch(() => {})));
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
        })));
        const shots = await Promise.all(pages.map(async (page,index) => {
          // Image rasterisation can finish after decode. Require two stable paints,
          // independently on each page, before comparing the two implementations.
          let previous = await page.screenshot({animations:'disabled',...(clip?{clip}:{})});
          for (let attempt=0;attempt<5;attempt++) {
            await page.waitForTimeout(200);
            const next = await page.screenshot({animations:'disabled',...(clip?{clip}:{})});
            if (next.equals(previous)) {
              await writeFile(resolve(artifacts, `${key}-${state}-${index ? 'candidate' : 'reference'}.png`),next);
              return next;
            }
            previous=next;
          }
          throw new Error(`Unstable rendering: ${key}-${state}-${index}`);
        }));
        const comparison = await compare(shots[0],shots[1],`${key}-${state}`);
        if (!comparison.pass) comparison.diagnostics = await Promise.all(pages.map(page => page.evaluate(() => ({
          scrollY, heroMotion: [...document.querySelectorAll('[data-component="idc-report-hero"] [data-idc-grid], [data-component="idc-report-hero"] [data-idc-plane], [data-component="idc-report-hero"] [data-slide1-image], [data-component="idc-report-hero"] [data-slide2-image]')].map(el=>({attributes:[...el.attributes].filter(a=>a.name.startsWith('data-')).map(a=>a.name),transform:el.style.transform,rect:el.getBoundingClientRect().toJSON()})), hero: [...document.querySelectorAll('[data-slide1-copy], [data-slide2-copy]')].map(el=>({rect:el.getBoundingClientRect().toJSON(),styles:[el,...el.querySelectorAll('*')].map(node=>({tag:node.tagName,text:node.childElementCount?'':node.textContent,rect:node.getBoundingClientRect().toJSON(),font:getComputedStyle(node).font,cls:node.className,width:getComputedStyle(node).width,maxWidth:getComputedStyle(node).maxWidth,transform:getComputedStyle(node).transform}))})), images: [...document.images].filter(image => {const r=image.getBoundingClientRect(); return r.width && r.bottom>0 && r.top<innerHeight;}).map(image => ({src:image.currentSrc, width:image.naturalWidth, rect:image.getBoundingClientRect().toJSON()}))
        }))));
        if(selector)comparison.region={selector,...clip};
        states.push(comparison);
      }
      await capture('top');
      if(process.env.YAJU_TEST_SEARCH==='1'){
        await Promise.all(pages.map(page=>page.getByRole('button',{name:'Open blog search'}).first().click()));
        await Promise.all(pages.map(page=>page.waitForTimeout(500)));
        await capture('search-open');
        await capture('search-dialog-open','[role="dialog"] > div > div');
        await Promise.all(pages.map(page=>page.getByRole('searchbox',{name:'Search articles'}).fill('Yaju agents')));
        await capture('search-query');
        await capture('search-dialog-query','[role="dialog"] > div > div');
        await Promise.all(pages.map(page=>page.keyboard.press('Escape')));
        await Promise.all(pages.map(page=>page.waitForTimeout(400)));
        await capture('search-closed');
        await Promise.all(pages.map(page=>page.evaluate(()=>scrollTo(0,0))));
      }
      if (viewport.name === 'desktop') {
        await Promise.all(pages.map(page => page.getByRole('link',{name:'Product',exact:true}).first().locator('xpath=ancestor::li[1]').hover()));
        await Promise.all(pages.map(page => page.waitForTimeout(300)));
        await capture('product-menu');
        await Promise.all(pages.map(page => page.mouse.move(10,500)));
      }
      await Promise.all(pages.map(page => page.evaluate(() => window.scrollTo(0,800))));
      await Promise.all(pages.map(page => page.waitForTimeout(motion==='reduce'?1500:3500)));
      await capture('scroll');
      for(const offset of (process.env.YAJU_TEST_SCROLL_OFFSETS||'').split(',').filter(Boolean).map(Number)) {
        assert.ok(Number.isFinite(offset)&&offset>=0,'Invalid scroll offset');
        await Promise.all(pages.map(page=>page.evaluate(y=>window.scrollTo(0,y),offset)));
        await Promise.all(pages.map(page=>page.waitForTimeout(motion==='reduce'?1500:3500)));
        await capture(`scroll-${offset}`);
      }
      if(process.env.YAJU_TEST_CAROUSELS === '1') {
        const counts=await Promise.all(pages.map(p=>p.locator('main button[aria-label="Next"]').count()));
        assert.equal(counts[0],counts[1],`Carousel count: ${route}`);
        for(let group=0;group<counts[0];group++){
          await Promise.all(pages.map(p=>p.locator('main button[aria-label="Next"]').nth(group).scrollIntoViewIfNeeded()));
          await pages[0].waitForTimeout(1800);
          await capture(`carousel-${group}-initial`);
          const enabled=await Promise.all(pages.map(p=>p.locator('main button[aria-label="Next"]').nth(group).isEnabled()));
          assert.equal(enabled[0],enabled[1],`Carousel availability: ${route}`);
          if(enabled[0]){
            await Promise.all(pages.map(p=>p.locator('main button[aria-label="Next"]').nth(group).click()));
            await pages[0].waitForTimeout(1800);
            await capture(`carousel-${group}-next`);
          }
        }
      }
      if(process.env.YAJU_TEST_ACCORDIONS === '1') {
        const selector='main button.pb-9';
        const count=await pages[0].locator(selector).count();
        assert.equal(await pages[1].locator(selector).count(),count,`Accordion count ${route}`);
        for(let index=0;index<count;index++) {
          await Promise.all(pages.map(page=>page.locator(selector).nth(index).scrollIntoViewIfNeeded()));
          await Promise.all(pages.map(page=>page.waitForTimeout(800)));
          await Promise.all(pages.map(page=>page.locator(selector).nth(index).click()));
          await Promise.all(pages.map(page=>page.waitForTimeout(1000)));
          await capture(`accordion-${index}`);
        }
      }
      if (route === '/legal') {
        await Promise.all(pages.map(page => page.evaluate(() => scrollTo(0,0))));
        await Promise.all(pages.map(page => page.waitForTimeout(500)));
        if (viewport.name === 'desktop') {
          for (const label of ['Solutions','Resources','Blog','Company']) {
            await Promise.all(pages.map(page => page.getByRole('link',{name:label,exact:true}).first().locator('xpath=ancestor::li[1]').hover()));
            await Promise.all(pages.map(page => page.waitForTimeout(350)));
            await capture(`menu-${label.toLowerCase()}`);
          }
          await Promise.all(pages.map(page => page.mouse.move(5,700)));
          await Promise.all(pages.map(page => page.waitForTimeout(400)));
        } else {
          await Promise.all(pages.map(page => page.getByRole('button',{name:'Open navigation menu',exact:true}).click()));
          await Promise.all(pages.map(page => page.waitForTimeout(500)));
          await capture('mobile-menu');
          for (const label of ['Product','Solutions','Resources','Blog','Company']) {
            await Promise.all(pages.map(page => page.getByRole('button',{name:label,exact:true}).first().click()));
            await Promise.all(pages.map(page => page.waitForTimeout(500)));
            await capture(`mobile-${label.toLowerCase()}`);
            await Promise.all(pages.map(page => page.getByRole('button',{name:/Back/}).click()));
            await Promise.all(pages.map(page => page.waitForTimeout(500)));
          }
          await Promise.all(pages.map(page => page.getByRole('button',{name:'Close navigation menu',exact:true}).click()));
        }
        await Promise.all(pages.map(page => page.evaluate(() => scrollTo(0,document.body.scrollHeight))));
        await Promise.all(pages.map(page => page.waitForTimeout(500)));
        await capture('footer');
        if (viewport.name === 'mobile') {
          for (const label of ['Platform','Product','Functionalities','Solutions','By Industry','Deployment','Resources','Company','Legal']) {
            await Promise.all(pages.map(page => page.locator('footer').getByRole('button',{name:new RegExp(label)}).click()));
            await Promise.all(pages.map(page => page.waitForTimeout(500)));
            await capture(`footer-${label.toLowerCase().replaceAll(' ','-')}`);
            await Promise.all(pages.map(page => page.locator('footer').getByRole('button',{name:new RegExp(label)}).click()));
          }
        }
        await Promise.all(pages.map(page => page.locator('footer').getByRole('button',{name:/English/}).click()));
        await Promise.all(pages.map(page => page.waitForTimeout(300)));
        await capture('language');
        await Promise.all(pages.map(page => page.mouse.click(5,5)));
        await Promise.all(pages.map(page => page.evaluate(() => scrollTo(0,0))));
        await Promise.all(pages.map(page => page.waitForTimeout(500)));
        await Promise.all(pages.map(page => page.getByRole('button',{name:'Close banner',exact:true}).click()));
        await Promise.all(pages.map(page => page.waitForTimeout(500)));
        await capture('banner-closed');
      }
      const brokenImages = await Promise.all(pages.map(page => page.evaluate(() => [...document.images].filter(image => image.complete && !image.naturalWidth).map(image => ({src:image.getAttribute('src'), currentSrc:image.currentSrc})))));
      const errorParity = errors[1].every(error => errors[0].some(original => original.name === error.name && original.message === error.message));
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
