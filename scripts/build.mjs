import { readFile, writeFile, mkdir, rm, rename, lstat } from 'node:fs/promises';
import { resolve, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { site } from '../config/site.mjs';
import { renderRedirect } from '../src/components/redirect.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const pilotOutput = process.argv.includes('--native-legal');
if (process.argv.slice(2).some(arg => arg !== '--native-legal')) throw new Error('Unknown build option');
const output = resolve(root, pilotOutput ? 'artifacts/native-pilot' : 'public');
const staging = resolve(root, pilotOutput ? 'artifacts/.native-staging' : '.build-staging');
const previous = resolve(root, pilotOutput ? 'artifacts/.native-previous' : '.build-previous');
const inputs = JSON.parse(await readFile(resolve(root, 'config/site-inputs.json'), 'utf8'));
const textExtensions = /\.(html|js|css|json|webmanifest)$/;
const override = await readFile(resolve(root, 'static/assets/yaju-hydration-safe.css'), 'utf8');
const analyticsMarker = `gtag('config', '${site.analyticsId}')`;
const analytics = `
<!-- Google tag (gtag.js) -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${site.analyticsId}');
</script>`;

function confined(base, name) {
  const path = resolve(base, name);
  if (!path.startsWith(base.endsWith(sep) ? base : base + sep)) {
    throw new Error(`Path escapes source/output directory: ${name}`);
  }
  return path;
}

// Validate the complete input list before writing or replacing the last good build.
const destinations = new Set();
for (const entry of inputs) {
  if (!/^(src\/pages|static|legacy\/runtime)\//.test(entry.source) && !['src/content/legal.json', 'src/client/navigation.js'].includes(entry.source)) {
    throw new Error(`Input outside the public source allowlist: ${entry.source}`);
  }
  const source = confined(root, entry.source);
  if (!(await lstat(source)).isFile()) throw new Error(`Not a regular file: ${entry.source}`);
  confined(staging, entry.output);
  if (destinations.has(entry.output)) throw new Error(`Duplicate output: ${entry.output}`);
  destinations.add(entry.output);
}
await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
let htmlCount = 0;
for (const entry of inputs) {
  let target = entry.output.replace(/^_next\//, '_yaju/');
  let bytes = await readFile(resolve(root, entry.source));
  if (entry.render === 'redirect') bytes = Buffer.from(renderRedirect(JSON.parse(bytes.toString('utf8'))));
  else if (entry.render === 'legal') {
    const { renderLegalPage } = await import('../src/components/site-layout.mjs');
    bytes = Buffer.from(await renderLegalPage(JSON.parse(bytes.toString('utf8'))));
  }
  else if (entry.render) throw new Error(`Unknown renderer: ${entry.render}`);
  if (textExtensions.test(target)) {
    let content = bytes.toString('utf8').replaceAll('/_next/', '/_yaju/');
    if (target.endsWith('.html')) {
      htmlCount++;
      content = content.replace(/site-updates-2026-09-29\.js(?:\?v=[^"']*)?/g,
        `${site.compatibilityScript}?v=${site.compatibilityVersion}`);
      if (!content.includes(analyticsMarker)) content = content.replace('<head>', `<head>${analytics}`);
    }
    if (/^_yaju\/static\/immutable\/chunks\/[^/]+\.css$/.test(target)) {
      content += override;
      target = target.replace(/\.css$/, `-${site.stylesheetVersion}.css`);
    }
    if (/\.(html|js|json|webmanifest)$/.test(target)) {
      content = content.replace(/(\/_yaju\/static\/immutable\/chunks\/[^"'\\?]+)\.css/g,
        `$1-${site.stylesheetVersion}.css`);
    }
    bytes = Buffer.from(content);
  }
  const destination = confined(staging, target);
  await mkdir(dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
}
// Keep the preceding build recoverable until the new output has been completed.
await rm(previous, { recursive: true, force: true });
try { await rename(output, previous); } catch (error) { if (error.code !== 'ENOENT') throw error; }
try { await rename(staging, output); }
catch (error) { await rename(previous, output).catch(() => {}); throw error; }
await rm(previous, { recursive: true, force: true });
console.log(`Built ${inputs.length} explicit public files (${htmlCount} HTML documents/fragments) to ${relative(root, output)}.`);
